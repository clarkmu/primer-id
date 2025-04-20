use anyhow::{ Result, Context };
use utils::{
    compress::compress_dir,
    email_templates::results_email_template,
    load_env_vars::{ load_env_vars, EnvVars },
    load_locations::Locations,
    pipeline::{ CoreceptorAPI, Pipeline },
    run_command::run_command,
    send_email::send_email,
};

pub async fn process(pipeline: &Pipeline<CoreceptorAPI>, locations: Locations) -> Result<()> {
    pipeline.add_log(&format!("Initializing Coreceptor pipeline #{}", &pipeline.id))?;

    let EnvVars { is_dev, .. } = load_env_vars();

    let job_id: String = pipeline.job_id();

    let sequence_file = format!("{}/sequences.fasta", &pipeline.scratch_dir);

    // let download_to: &str = &format!("{}/inputs", &pipeline.scratch_dir);
    let results_location = format!("{}/{}", &pipeline.scratch_dir, &job_id);
    let output_csv_location = format!("{}/{}.csv", &results_location, &job_id);
    let run_pipeline_command: String = format!(
        "conda run -n coreceptor python3 {}/coreceptor.py {} {}",
        &locations.coreceptor_base_path,
        &sequence_file,
        &job_id
    );

    // write pipeline.data.sequences to a file
    if !std::path::Path::new(&sequence_file).exists() {
        std::fs
            ::write(&sequence_file, &pipeline.data.sequences)
            .context("Failed to write sequences to file.")?;
    }

    // coreceptor.py run
    if !is_dev {
        pipeline.add_log(
            format!(
                "Running Coreceptor command: {:?}\nExec Location: {}",
                &run_pipeline_command,
                &results_location
            ).as_str()
        )?;
        run_command(&run_pipeline_command, &pipeline.scratch_dir).expect(
            "Failed in coreceptor.py run."
        );
    } else {
        // can't run Selenium on Mac, so...
        // create file at output_csv_location and write "test" to it
        std::fs::write(&output_csv_location, "test").context("Failed to write test to file.")?;
    }

    let existing_csv_location = format!("{}/{}.csv", &pipeline.scratch_dir, &job_id);
    if std::path::Path::new(&existing_csv_location).exists() {
        let destination = format!("{}/{}.csv", &results_location, &job_id);
        std::fs::create_dir_all(&results_location).context("Failed to create results directory.")?;
        std::fs
            ::rename(&existing_csv_location, &destination)
            .context("Failed to move existing CSV file to results location.")?;
    }

    if !std::path::Path::new(&output_csv_location).exists() {
        return Err(anyhow::anyhow!("Failed to create .csv file."));
    }

    // compress results
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
    let results_body = results_email_template(signed_url, "");
    send_email(
        &format!("Coreceptor Results #{}", &job_id),
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
