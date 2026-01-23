use std::fs::{ File };
use std::io::{ Write };
use std::path::PathBuf;
use glob::glob;
use anyhow::{ Result, Context };
use utils::compress::compress_dir;
use utils::email_templates::results_email_template;
use utils::pipeline::LocatorAPI;
use utils::run_command::run_command;
use utils::{ pipeline::{ Pipeline }, send_email::send_email, load_locations::Locations };

pub async fn process(pipeline: &Pipeline<LocatorAPI>, locations: Locations) -> Result<()> {
    pipeline.add_log(&format!("Initializing Locator pipeline #{}", &pipeline.id))?;

    // set up variables
    let job_id: String = pipeline.job_id();
    let work_dir = PathBuf::from(&pipeline.scratch_dir).join("work");
    let results_dir = PathBuf::from(&pipeline.scratch_dir).join(&job_id);

    if !work_dir.exists() {
        std::fs::create_dir_all(&work_dir).context("Failed to create work directory.")?;
    }
    if !results_dir.exists() {
        std::fs::create_dir_all(&results_dir).context("Failed to create results directory.")?;
    }

    // download from bucket
    pipeline.add_log(&format!("Downloading from bucket to {}", &work_dir.display()))?;
    pipeline
        .bucket_download("*", &work_dir.display().to_string(), true)
        .context("Failed to download bucket files")?;

    // glob download_to for each .fasta file
    let jobs: Vec<PathBuf> = glob(&format!("{}/*.fasta", &work_dir.display().to_string()))
        .unwrap()
        .map(|f| f.unwrap())
        .collect();

    // track viral_seq error files for admin to review
    let mut viral_seq_errors: Vec<String> = vec![];

    // thread jobs, run each fasta file using locator
    jobs.into_iter()
        .enumerate()
        .for_each(|(i, pathbuf)| {
            let date_now = chrono::Utc::now().to_rfc2822();

            let _ = pipeline.add_log(
                &format!("Initializing job #{}: {} at [{}]", &i, pathbuf.display(), &date_now)
            );

            // run command
            let locator_command = format!("conda run -n locator locator -i {}", &pathbuf.display());
            let _ = pipeline.add_log(&format!("Running Locator command: {}", &locator_command));
            if let Err(e) = run_command(&locator_command, &pipeline.scratch_dir) {
                let error_filename = format!(
                    "{}.error",
                    pathbuf.file_name().unwrap().to_string_lossy()
                );
                let error_path = std::path::Path::new(&pipeline.scratch_dir).join(&error_filename);
                let error_file = File::create(&error_path).ok();
                if let Some(mut file) = error_file {
                    let _ = writeln!(file, "{}", e);
                    viral_seq_errors.push(error_filename);
                }
            }
        });

    // compress results
    pipeline.add_log(
        &format!(
            "Compressing results\nInput: {}\nOutput: {}",
            &work_dir.display().to_string(),
            &results_dir.display().to_string()
        )
    )?;
    let (location, compressed_filename) = compress_dir(
        &pipeline.data.results_format,
        &job_id,
        &work_dir.display().to_string(),
        &results_dir.display().to_string()
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
    let results_body = results_email_template(signed_url, "");
    send_email(
        &format!("Locator Dating Results #{}", &job_id),
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

    // alert admin of locator errors
    if viral_seq_errors.len() > 0 {
        let error_string = "Error files:\n\n".to_owned() + &viral_seq_errors.join("\n");

        println!("Emailing error_string to admin:\n{}", &error_string);

        send_email(
            &format!("Locator Contains Error file: ID: {}", &pipeline.data.id),
            &error_string,
            &locations.admin_email,
            false
        ).await?;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test() {
        //
    }
}
