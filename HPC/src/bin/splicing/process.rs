use std::{ collections::HashMap, path::Path, sync::{ Arc, Mutex } };
use anyhow::{ Result, Context };
use utils::{
    compress::compress_dir,
    email_templates::{ receipt_email_template, results_email_template },
    load_locations::Locations,
    pipeline::{ Pipeline, SplicingAPI },
    run_command::run_command,
    send_email::send_email,
};
use rayon::prelude::*;
use crate::sort_files::{ sort_files, RFiles };

/*

FILE STRUCTURE
=================
temp_downloads
libs
  ├── lib_1
  │   ├── lib_1_r1.fastq
  │   ├── lib_1_r2.fastq
  ...
results

*/

pub async fn process(pipeline: &Pipeline<SplicingAPI>, locations: Locations) -> Result<()> {
    pipeline.add_log(&format!("Initializing Splicing pipeline #{}", &pipeline.id))?;

    // patch as pending
    pipeline
        .patch_pipeline(serde_json::json!({"pending": true, "submit": false})).await
        .context("Failed to patch pipeline as pending.")?;

    // set up variables
    let receipt_body: String = generate_receipt_email(&pipeline.data);
    let pool_name = pipeline.data.pool_name.clone().unwrap_or(pipeline.data.id.clone());
    let htsf_location = pipeline.data.htsf.clone().unwrap_or("".to_string());
    let job_id: String = format!("splicing-results_{}", &pool_name);
    let samples_dir = format!("{}/libs", &pipeline.scratch_dir);
    let results_location = format!("{}/{}", &pipeline.scratch_dir, &job_id);

    //create directories
    if !Path::new(&samples_dir).exists() {
        std::fs::create_dir(&samples_dir).context("Failed to create DR directory.")?;
    }

    if !Path::new(&results_location).exists() {
        std::fs::create_dir(&results_location).context("Failed to create results directory.")?;
    }

    // mail receipt
    pipeline.add_log("Emailing receipt.")?;
    send_email(
        &format!("Splicing Submission #{}", &job_id),
        &receipt_body,
        &pipeline.data.email,
        true
    ).await.context("Failed to send receipt email.")?;

    let jobs: HashMap<String, RFiles>;

    // sort files for HTSF / Uploaded
    if !htsf_location.is_empty() {
        pipeline.add_log(&format!("Transferring results from HTSF location: {}", &htsf_location))?;

        if !Path::new(&htsf_location).exists() {
            return Err(anyhow::anyhow!("HTSF location does not exist: {}", &htsf_location));
        }

        jobs = sort_files(&htsf_location, &samples_dir).context("Failed to sort input files.")?;
    } else {
        let from: String = String::from("*");

        let temp_downloads_dir = format!("{}/temp_downloads", &pipeline.scratch_dir);

        pipeline.add_log("Downloading samples from bucket.")?;
        pipeline
            .bucket_download(&from, &temp_downloads_dir, true)
            .context("Failed to download bucket files.")?;

        jobs = sort_files(&temp_downloads_dir, &samples_dir).context(
            "Failed to sort input files."
        )?;

        if Path::new(&temp_downloads_dir).exists() {
            std::fs::remove_dir_all(&temp_downloads_dir)?;
        }
    }

    // run Splicing
    let errors = Arc::new(Mutex::new(Vec::<String>::new()));

    jobs.into_par_iter().for_each(|(lib_name, rfiles)| {
        let date_now = chrono::Utc::now().to_rfc2822();

        let _ = pipeline.add_log(&format!("Initializing job #{}: at [{}]", lib_name, &date_now));

        let r1_file = rfiles.r1.clone().unwrap_or("".to_string());
        let r2_file = rfiles.r2.clone().unwrap_or("".to_string());

        let command = format!(
            "conda run -n splicing --cwd {} cargo run -- {} {} {} {} {}",
            &locations.splicing_base_path,
            &pipeline.data.strain,
            &pipeline.data.distance,
            &pipeline.data.assay,
            &r1_file,
            &r2_file
        );

        let process_output = run_command(&command, &pipeline.scratch_dir);

        let output_file = Path::new(&r1_file).parent().unwrap().join("output.tsv");

        if let Err(e) = process_output {
            println!("ERROR LOG: {:?}", &e);

            errors
                .lock()
                .unwrap()
                .push(format!("Failed to process lib#{}:\n{}", lib_name, &e.to_string()));
        } else if !output_file.exists() {
            let s = &process_output.unwrap_or("default".to_string());

            println!("ERROR LOG EXIST: {:?}", &s);

            errors.lock().unwrap().push(format!("Failed to process lib#{}:\n{}", lib_name, &s));
        } else {
            // move output file to results location
            let output_file_name = format!("{}_output.tsv", &lib_name);
            let output_file_destination = Path::new(&results_location).join(&output_file_name);
            let _ = std::fs
                ::copy(&output_file, &output_file_destination)
                .context("Failed to copy output file.");

            // move html output to results location
            let output_file = Path::new(&r1_file).parent().unwrap().join("output.html");
            let output_file_name = format!("{}_output.html", &lib_name);
            let output_file_destination = Path::new(&results_location).join(&output_file_name);
            let _ = std::fs
                ::copy(&output_file, &output_file_destination)
                .context("Failed to copy output file.");
        }
    });

    println!("Errors: {:?}", &errors);

    return Ok(());

    // move files to results location
    // let move_files_command = format!("mv {}/* {}", &pipeline.scratch_dir, &results_location);
    // run_command(&move_files_command, &pipeline.scratch_dir).context(
    //     "Failed to move files to results location."
    // )?;

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
    let results_body = results_email_template(signed_url, &"");
    send_email(
        &format!("Splicing Results #{}", &job_id),
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

fn generate_receipt_email(data: &SplicingAPI) -> String {
    let mut content: String = String::from("");

    let uploads = &data.uploads.clone().unwrap_or(vec![]);
    let htsf = &data.htsf.clone().unwrap_or("".to_string());

    if !uploads.is_empty() {
        content = String::from("You have uploaded the following sequences:\n\n");

        let filenames: Vec<String> = uploads
            .iter()
            .map(|upload| upload.file_name.clone())
            .collect();
        let filenames_str = filenames.join("\n");
        content.push_str(&filenames_str);
    } else if !htsf.is_empty() {
        let htsf = &data.htsf.clone().unwrap_or("undefined".to_string());
        content = format!("HTSF Location: {}", &htsf);
    }

    let receipt = receipt_email_template(&content);

    receipt
}
