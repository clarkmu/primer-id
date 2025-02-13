use anyhow::{ Result, Context };
use utils::{
    compress::compress_dir,
    email_templates::{ receipt_email_template, results_email_template },
    load_env_vars::{ load_env_vars, EnvVars },
    load_locations::Locations,
    pipeline::{ CoreReceptorAPI, Pipeline },
    run_command::run_command,
    send_email::send_email,
};

pub async fn process(pipeline: &Pipeline<CoreReceptorAPI>, locations: Locations) -> Result<()> {
    pipeline.add_log(&format!("Initializing OGV pipeline #{}", &pipeline.id))?;

    let EnvVars { is_dev, .. } = load_env_vars();

    // patch as pending
    pipeline
        .patch_pipeline(serde_json::json!({"pending": true, "submit": false})).await
        .context("Failed to patch pipeline as pending.")?;

    let job_id: String = if pipeline.data.job_id.is_empty() {
        format!("corereceptor-results_{}", &pipeline.data.id)
    } else {
        pipeline.data.job_id.clone()
    };

    let sequence_file = format!("{}/sequences.fasta", &pipeline.scratch_dir);

    // let download_to: &str = &format!("{}/inputs", &pipeline.scratch_dir);
    let results_location = format!("{}/{}", &pipeline.scratch_dir, &job_id);
    let output_csv_location = format!("{}/{}.csv", &results_location, &job_id);
    let run_pipeline_command: String = format!(
        "conda run -n corereceptor python3 {}/core_receptor.py {} {}",
        &locations.corereceptor_base_path,
        &sequence_file,
        &output_csv_location
    );

    let sequences_html = format!(
        "<u>Sequences</u></br>{}",
        &pipeline.data.sequences
            .split("\n")
            .filter(|line| line.starts_with(">"))
            .map(|l| l.replace(">", ""))
            .collect::<Vec<String>>()
            .join("</br>")
    );
    let receipt_body = receipt_email_template(&sequences_html);

    // write pipeline.data.sequences to a file
    if !std::path::Path::new(&sequence_file).exists() {
        std::fs
            ::write(&sequence_file, &pipeline.data.sequences)
            .context("Failed to write sequences to file.")?;
    }

    // email receipt
    pipeline.add_log("Emailing receipt.")?;
    send_email(
        &format!("Core Receptor Submission #{}", &job_id),
        &receipt_body,
        &pipeline.data.email,
        true
    ).await.context("Failed to send receipt email.")?;

    // core_receptor.py run
    if !is_dev {
        pipeline.add_log(
            format!(
                "Running Core Receptor command: {:?}\nExec Location: {}",
                &run_pipeline_command,
                &results_location
            ).as_str()
        )?;
        run_command(&run_pipeline_command, &pipeline.scratch_dir).expect(
            "Failed in core_receptor.py run."
        );
    } else {
        // can't run Selenium on Mac, so...
        // create file at output_csv_location and write "test" to it
        std::fs::write(&output_csv_location, "test").context("Failed to write test to file.")?;
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
        &format!("Core Receptor Results #{}", &job_id),
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
