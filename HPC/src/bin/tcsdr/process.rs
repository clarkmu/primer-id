use anyhow::{ Context, Result };
use glob::glob;
use rayon::prelude::*;
use std::path::Path;
use std::path::PathBuf;
use utils::{
    cloud_storage::{ get_signed_url, upload },
    compress::compress_dir,
    email_templates::results_email_template,
    load_locations::Locations,
    pipeline::{ Pipeline, TcsAPI },
    run_command::run_command,
    send_email::send_email,
};

use crate::{ generate_tcs_json::generate_tcs_json, sort_files::sort_files };

pub async fn process(pipeline: &Pipeline<TcsAPI>, locations: Locations) -> Result<()> {
    pipeline.add_log(&format!("Initializing TCS/DR pipeline #{}", &pipeline.id))?;

    // patch as pending
    pipeline
        .patch_pipeline(serde_json::json!({"pending": true, "submit": false})).await
        .context("Failed to patch pipeline as pending.")?;

    // set up variables
    let is_dr: bool = pipeline.is_dr();
    let pool_name = pipeline.pool_name();
    let htsf_location = pipeline.data.htsf.clone().unwrap_or("".to_string());
    let job_id: String = pipeline.job_id();
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
            .map(|f| std::fs::read_to_string(f).unwrap_or("Failed to read error file.".to_string()))
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

    let data_pool_name = pipeline.data.pool_name.clone().unwrap_or("".to_string());
    let pool_name_html = if !data_pool_name.is_empty() {
        format!("Pool Name: {}\n\n", &data_pool_name)
    } else {
        String::from("\n")
    };

    let results_body =
        format!("ID: {}\n{}", &pipeline.data.id, pool_name_html) +
        &results_email_template(signed_url, &log_link_html);

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
