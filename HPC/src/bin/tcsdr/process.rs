use std::path::Path;
use anyhow::{ Result, Context };
use utils::{
    compress::compress_dir,
    email_templates::{ receipt_email_template, results_email_template },
    load_locations::Locations,
    pipeline::{ Pipeline, TcsAPI },
    run_command::run_command,
    send_email::send_email,
};
use glob::glob;
use std::path::PathBuf;
use rayon::prelude::*;

use crate::{
    generate_tcs_json::generate_tcs_json,
    validate_file_names::{ validate_file_names, FilesResults },
};

pub async fn process(pipeline: &Pipeline<TcsAPI>, _locations: Locations) -> Result<()> {
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

    if !Path::new(&samples_dir).exists() {
        std::fs::create_dir(&samples_dir).context("Failed to create DR directory.")?;
    }

    // mail receipt
    pipeline.add_log("Emailing receipt.")?;
    send_email(
        &format!("TCS/DR Dating Submission #{}", &job_id),
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
        let input_sdrm = format!("{}_SDRM", &samples_dir);
        let sdrm_command = format!("conda run -n tcsdr tcs_sdrm {}", &temp_sdrm_dir);
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

    // compress results
    let results_location = &samples_dir;

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
    pipeline.add_log(
        &format!(
            "Uploading compressed results to bucket.\nFrom: {}\nTo: {}",
            &location.display(),
            &compressed_filename
        )
    )?;
    pipeline
        .bucket_upload(&location.display().to_string(), &compressed_filename)
        .context("Failed to upload files to bucket.")?;
    let signed_url = pipeline
        .bucket_signed_url(&compressed_filename)
        .context("Failed to generate a signed url.")?;

    // generate and send receipt
    pipeline.add_log("Emailing results.")?;
    let results_body = results_email_template(signed_url);
    send_email(
        &format!("OGV Dating Results #{}", &job_id),
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
    // if !Path::new(destination).exists() {
    //     std::fs
    //         ::create_dir(destination)
    //         .context("Failed to create destination directory at file sorting.")?;
    // }

    let location = Path::new(dir);

    let files: Vec<PathBuf> = glob(location.join("**").join("*.fast*").to_str().unwrap_or(""))?
        .map(|f| f.unwrap())
        .collect();

    let results: Vec<FilesResults> = validate_file_names(files).await.context(
        "Failed to validate file names."
    )?;

    for file in results {
        // /path/to/destination/{lib_name}/{file_name}
        let destination = Path::new(destination).join(file.lib_name).join(file.file_name);

        std::fs
            ::copy(file.file_path, destination)
            .context("Failed to copy file while iterating viralseq.result.files .")?;
    }

    Ok(())
}

mod tests {
    use super::*;

    #[tokio::test]
    async fn test_sort_files() {
        let dir = "./test_sort_fasta";
        // let location = Path::new(dir);

        let destination = "./test_sort_fasta_destination";

        let result = sort_files(dir, &destination).await;

        dbg!(&result);

        assert!(result.is_ok());
        // assert!(location.exists());
    }
}
