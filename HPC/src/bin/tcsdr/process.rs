use std::path::Path;
use anyhow::{ Result, Context };
use utils::{
    compress::compress_dir,
    email_templates::{ receipt_email_template, results_email_template },
    load_locations::Locations,
    pipeline::{ Pipeline, TcsAPI },
    run_command::run_command,
    send_email::send_email,
    cloud_storage::{ upload, get_signed_url },
};
use glob::glob;
use std::path::PathBuf;
use rayon::prelude::*;

use crate::{
    generate_tcs_json::generate_tcs_json,
    validate_file_names::{ validate_file_names, FilesResults },
};

pub async fn process(pipeline: &Pipeline<TcsAPI>, locations: Locations) -> Result<()> {
    pipeline.add_log(&format!("Initializing TCS/DR pipeline #{}", &pipeline.id))?;

    // patch as pending
    pipeline
        .patch_pipeline(serde_json::json!({"pending": true, "submit": false})).await
        .context("Failed to patch pipeline as pending.")?;

    // set up variables
    let temp_primers = pipeline.data.primers.clone().unwrap_or(vec![]);
    let is_dr: bool = temp_primers.is_empty();
    let receipt_body: String = generate_receipt_email(&pipeline.data);
    let temp_pool_name = pipeline.data.pool_name.clone().unwrap_or("".to_string());
    let pool_name = if temp_pool_name.is_empty() { "TCSDR".to_string() } else { temp_pool_name };
    let htsf_location = pipeline.data.htsf.clone().unwrap_or("".to_string());
    let job_id: String = format!("{}-results_{}", if is_dr { "dr" } else { "tcs" }, &pool_name);
    let samples_dir = format!("{}/{}", &pipeline.scratch_dir, pool_name);
    let log_upload_location = format!(
        "{}/logs/{}/log.html",
        &locations.tcs_log_bucket_url,
        &pipeline.id
    );
    let log_local_location = format!("{}_tcs/log.html", &samples_dir);

    if !Path::new(&samples_dir).exists() {
        std::fs::create_dir(&samples_dir).context("Failed to create DR directory.")?;
    }

    // mail receipt
    pipeline.add_log("Emailing receipt.")?;
    send_email(
        &format!("{} Submission #{}", if is_dr { "DR" } else { "TCS" }, &job_id),
        &receipt_body,
        &pipeline.data.email,
        true
    ).await.context("Failed to send receipt email.")?;

    // transfer samples
    if !htsf_location.is_empty() {
        pipeline.add_log(&format!("Transferring results from HTSF location: {}", &htsf_location))?;
        sort_files(&htsf_location, &samples_dir).await.context(
            "Failed to sort input files by lib name."
        )?;
    } else {
        let from: String = String::from("*");

        pipeline.add_log("Downloading samples from bucket.")?;
        pipeline
            .bucket_download(&from, &samples_dir, true)
            .context("Failed to download bucket files.")?;
    }

    // thread TCS/DR jobs
    let jobs: Vec<PathBuf> = glob(&format!("{}/*", &samples_dir))
        .unwrap()
        .map(|f| f.unwrap())
        .collect();

    jobs.into_par_iter()
        .enumerate()
        .for_each(|(i, pathbuf)| {
            let date_now = chrono::Utc::now().to_rfc2822();
            let lib_name = pathbuf.file_name().unwrap().to_str().unwrap();

            let _ = pipeline.add_log(
                &format!("Initializing job #{}: {} at [{}]", &i, lib_name, &date_now)
            );

            // run commands
            if is_dr {
                let dr_command = format!(
                    "conda run -n tcsdr tcs -d {} -i {}",
                    &pipeline.data.dr_version,
                    &pathbuf.display()
                );
                let _ = pipeline.add_log(&format!("Running DR command: {}", &dr_command));
                if let Err(_e) = run_command(&dr_command, &pipeline.scratch_dir) {
                    //
                }
            } else {
                let json_location = generate_tcs_json(
                    &pipeline.data,
                    &pathbuf.display().to_string(),
                    &lib_name
                ).unwrap_or("".to_string());

                if json_location.is_empty() {
                    //todo create an error file at &pipeline.scratch_dir
                    print!("TCS JSON location empty.");
                    return;
                }

                if !Path::new(&json_location).exists() {
                    print!("TCS JSON does not exist.");
                    return;
                }

                let tcs_command = format!("conda run -n tcsdr tcs -p {}", &json_location);
                if let Err(_e) = run_command(&tcs_command, &pipeline.scratch_dir) {
                    //
                }
            }
        });

    // check for TCS errors written to the .error file of each subdirectory
    let tcs_error_files = glob(&format!("{}/*/.error", &samples_dir))
        .unwrap()
        .map(|f| f.unwrap())
        .collect::<Vec<PathBuf>>();

    if !tcs_error_files.is_empty() {
        let tcs_error_msg = tcs_error_files
            .iter()
            .map(|f| {
                std::fs::read_to_string(f).unwrap_or("Failed to read error file.".to_string())
            })
            .collect::<Vec<String>>()
            .join("\n\n");

        return Err(anyhow::anyhow!("TCS/DR Error:\n\n{}", tcs_error_msg));
    }

    // process concensus
    let consensus_command = format!("conda run -n tcsdr tcs_log {}", &samples_dir);
    run_command(&consensus_command, &pipeline.scratch_dir).context("Failed to run consensus.")?;

    // run SDRM
    if is_dr {
        let temp_sdrm_dir = format!("{}/temp", &pipeline.scratch_dir);
        let input_sdrm = format!("{}_DRM_analysis", &samples_dir);
        let sdrm_command = format!(
            "conda run -n tcsdr tcs_sdrm {} {}",
            &temp_sdrm_dir,
            &pipeline.data.dr_version
        );
        let sdrm_error_file = format!("{}/.error", &input_sdrm);
        let cp_command = format!(
            "cp -R {}/. {}/",
            &format!("{}_tcs/combined_TCS_per_lib", &samples_dir),
            &temp_sdrm_dir
        );

        if !Path::new(&temp_sdrm_dir).exists() {
            std::fs::create_dir(&temp_sdrm_dir).context("Failed to create temp SDRM directory.")?;
        }

        run_command(&cp_command, &pipeline.scratch_dir).context(
            "Failed to copy files to temp SDRM directory."
        )?;

        run_command(&sdrm_command, &temp_sdrm_dir).context("Failed to run SDRM.")?;

        if Path::new(&sdrm_error_file).exists() {
            let sdrm_error_msg = std::fs
                ::read_to_string(&sdrm_error_file)
                .unwrap_or("SDRM error and Failed to read SDRM error file.".to_string());

            return Err(anyhow::anyhow!("SDRM Error:\n\n{}", sdrm_error_msg));
        }
    }

    // add log to email as link
    upload(&log_local_location, &log_upload_location).context("")?;
    let log_signed_url = get_signed_url(&log_upload_location).context("")?;
    let log_link_html = format!(
        "<br><a href='{}' style='font-size: 18px;'>View Report</a><br>",
        &log_signed_url
    );

    // compress results
    let results_location = format!("{}/{}", &pipeline.scratch_dir, &job_id);

    if !Path::new(&results_location).exists() {
        std::fs::create_dir(&results_location).context("Failed to create results directory.")?;
    }

    // move files to results location
    let move_files_command = format!("mv {}/* {}", &pipeline.scratch_dir, &results_location);
    run_command(&move_files_command, &pipeline.scratch_dir).context(
        "Failed to move files to results location."
    )?;

    pipeline.add_log(
        &format!(
            "Compressing results\nInput: {}\nOutput: {}",
            &results_location,
            &pipeline.scratch_dir
        )
    )?;
    let (location, compressed_filename) = compress_dir(
        &pipeline.data.results_format,
        &job_id,
        &results_location,
        &pipeline.scratch_dir
    ).context("Failed to compress files.")?;

    // upload compressed results and get signed url to compressed results
    pipeline
        .bucket_upload(&location.display().to_string(), &compressed_filename)
        .context("Failed to upload files to bucket.")?;
    let signed_url = pipeline
        .bucket_signed_url(&compressed_filename)
        .context("Failed to generate a signed url.")?;

    // generate and send receipt
    pipeline.add_log("Emailing results.")?;
    let results_body = results_email_template(signed_url, &log_link_html);
    send_email(
        &format!("{} Results #{}", if is_dr { "DR" } else { "TCS" }, &job_id),
        &results_body,
        &pipeline.data.email,
        false
    ).await?;

    // patch as completed
    pipeline
        .patch_pipeline(
            serde_json::json!({
                    "pending": false,
                    "submit": false,
                })
        ).await
        .context("Failed to patch pipeline as completed.")?;

    Ok(())
}

fn generate_receipt_email(data: &TcsAPI) -> String {
    let mut content: String = String::from("");

    let uploads = &data.uploads.clone().unwrap_or(vec![]);
    let htsf = &data.htsf.clone().unwrap_or("".to_string());

    if !uploads.is_empty() {
        content = String::from("You have uploaded the following sequences:\n");
    } else if !htsf.is_empty() {
        let htsf = &data.htsf.clone().unwrap_or("undefined".to_string());
        content = format!("HTSF Location: {}", &htsf);
    }

    let receipt = receipt_email_template(&content);

    receipt
}

async fn sort_files(dir: &str, destination: &str) -> Result<()> {
    if !Path::new(destination).exists() {
        std::fs
            ::create_dir(destination)
            .context("Failed to create destination directory at file sorting.")?;
    }

    let location = Path::new(dir);

    let files: Vec<PathBuf> = glob(location.join("**").join("*.fast*").to_str().unwrap_or(""))?
        .map(|f| f.unwrap())
        .collect();

    let results: Vec<FilesResults> = validate_file_names(files).await.context(
        "Failed to validate file names."
    )?;

    for file in results {
        // /path/to/destination/{lib_name}/{file_name}
        let destination_dir = Path::new(destination).join(file.lib_name);
        let destination = destination_dir.join(file.file_name);

        if !destination_dir.exists() {
            std::fs
                ::create_dir(&destination_dir)
                .with_context(||
                    format!(
                        "Failed to create destination directory while iterating viralseq.result.files.: {}",
                        file.file_path.display()
                    )
                )?;
        }

        std::fs
            ::copy(file.file_path, destination)
            .context("Failed to copy file while iterating viralseq.result.files .")?;
    }

    Ok(())
}

mod tests {
    #[allow(unused_imports)]
    use super::*;

    #[tokio::test]
    async fn test_sort_files() {
        // tests sort_files and ./validate_file_names

        let dir = "./tests/fixtures/tcsdr/dr_control";
        let destination = "./tests/sort_fasta_output";

        let result = sort_files(dir, &destination).await;

        assert!(result.is_ok());

        let files = glob(PathBuf::from(destination).join("**").join("*.fast*").to_str().unwrap())
            .unwrap()
            .map(|f| f.unwrap())
            .collect::<Vec<PathBuf>>();

        assert_eq!(files.len(), 2);
    }
}
