use std::collections::HashMap;
use std::fs::{ File, OpenOptions };
use std::io::{ BufWriter, Write };
use anyhow::{ Result, Context };
use utils::compress::compress_dir;
use utils::email_templates::{ receipt_email_template, results_email_template };
use utils::pipeline::Upload;
use utils::run_command::run_command;
use utils::{ pipeline::{ OgvAPI, Pipeline }, send_email::send_email, load_locations::Locations };

pub async fn process(pipeline: &Pipeline<OgvAPI>, locations: Locations) -> Result<()> {
    pipeline.add_log(&format!("Initializing OGV pipeline #{}", &pipeline.id))?;

    // patch as pending
    pipeline
        .patch_pipeline(serde_json::json!({"pending": true, "submit": false})).await
        .context("Failed to patch pipeline as pending.")?;

    // set up variables
    let receipt_body: String = generate_receipt_email(
        &pipeline.data.conversion,
        &pipeline.data.uploads
    );
    let download_to: &str = &format!("{}/data", &pipeline.scratch_dir);
    let samples_file_location: String = format!("{}/samples.json", &pipeline.scratch_dir);
    let results_location: String = format!("{}/results", &pipeline.scratch_dir);
    let summary_location: String = format!("{}/summary.csv", &results_location);
    let conversion_location: String = format!("{}/conversion.json", &pipeline.scratch_dir);
    let job_id: String = if pipeline.data.job_id.is_empty() {
        format!("ogv-results_{}", &pipeline.data.id)
    } else {
        pipeline.data.job_id.clone()
    };
    let run_summary_command: String = format!(
        "conda run -n ogv python3 {}/scripts/result-summary.py -d {} -j {} -o {}",
        &locations.ogv_base_path,
        format!("{}/results/dating/", &pipeline.scratch_dir),
        &conversion_location,
        &summary_location
    );
    let run_pipeline_command: String = format!(
        "conda run -n ogv snakemake --cores 4 --config job_dir='{}/' --configfile {} --directory {}/ --keep-going --snakefile {}/Snakefile",
        &pipeline.scratch_dir,
        samples_file_location,
        &locations.ogv_base_path,
        &locations.ogv_base_path
    );

    // email receipt
    pipeline.add_log("Emailing receipt.")?;
    send_email(
        &format!("OGV Dating Submission #{}", &job_id),
        &receipt_body,
        &pipeline.data.email,
        true
    ).await.context("Failed to send receipt email.")?;

    // download from bucket
    pipeline.add_log(&format!("Downloading from bucket to {}", &download_to))?;
    pipeline.bucket_download("*", download_to, true).context("Failed to download bucket files")?;

    // create samples file
    pipeline.add_log(&format!("Creating Samples file: {}", &samples_file_location))?;
    generate_samples_file(&pipeline.data.uploads, &samples_file_location).context(
        "Failed to generate samples file."
    )?;

    //run OGV
    pipeline.add_log(
        format!(
            "Running OGV command: {:?}\nExec Location: {}",
            &run_pipeline_command,
            &pipeline.scratch_dir
        ).as_str()
    )?;
    run_command(&run_pipeline_command, &pipeline.scratch_dir).expect("Failed in Snakemake run.");

    // create conversion file
    pipeline.add_log(&format!("Creating conversion file: {}", &conversion_location))?;
    write_conversion_to_file(pipeline.data.conversion.clone(), &conversion_location).context(
        "Failed to create conversion file."
    )?;

    // run summary
    pipeline.add_log(
        format!(
            "Exec: {:?}\nExec Location: {}",
            &run_summary_command,
            &pipeline.scratch_dir
        ).as_str()
    )?;
    run_command(&run_summary_command, &pipeline.scratch_dir).context(
        "Failed to run result-summary.py"
    )?;

    // ensure processing results were created
    if !std::path::Path::new(&summary_location).exists() {
        return Err(anyhow::anyhow!("Failed to create summary file."));
    }

    // check for runtime errors
    let error_file_location = format!("{}/error", &pipeline.scratch_dir);
    if std::path::Path::new(&error_file_location).exists() {
        let error_file = std::fs
            ::read_to_string(&error_file_location)
            .context("Failed to read error file")?;
        return Err(anyhow::anyhow!(error_file));
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

fn generate_receipt_email(conversion: &HashMap<String, String>, uploads: &Vec<Upload>) -> String {
    let conversion_html =
        "<u>Start2Art</u>:<br>".to_string() +
        &conversion
            .iter()
            .map(|(k, v)| format!("{}: {}", k, v))
            .collect::<Vec<String>>()
            .join("<br>");

    let uploads_html =
        "<u>Uploads</u>:<br>".to_string() +
        &uploads
            .iter()
            .map(|u| format!("{}: {}", u.lib_name, u.file_name))
            .collect::<Vec<String>>()
            .join("<br>");

    let receipt = receipt_email_template(&format!("{}</br></br>{}", conversion_html, uploads_html));

    receipt
}

fn generate_samples_file(uploads: &Vec<Upload>, samples_file_location: &str) -> Result<()> {
    #[derive(serde::Serialize)]
    struct Samples {
        samples: Vec<String>,
    }

    let mut samples_json: Samples = Samples { samples: Vec::new() };

    for upload in &uploads.to_vec() {
        samples_json.samples.push(format!("{}/{}", &upload.lib_name, &upload.file_name));
    }

    let mut file = OpenOptions::new()
        .write(true)
        .create(true)
        .open(&samples_file_location)
        .context("Failed to create/open samples file.")?;

    writeln!(file, "{}", serde_json::to_string(&samples_json)?).context(
        "Failed to convert samples to string and write to file."
    )?;

    Ok(())
}

fn write_conversion_to_file(
    conversion: HashMap<String, String>,
    conversion_location: &str
) -> Result<bool> {
    #[derive(serde::Serialize)]
    #[allow(non_snake_case)]
    struct Conversion {
        Start2ART: i32,
        colors: Vec<i32>,
    }

    let conversion_json: HashMap<String, Conversion> = HashMap::from(
        conversion
            .into_iter()
            .map(|(k, v)| {
                let value: i32 = v.parse().unwrap();
                (k, Conversion { Start2ART: value, colors: Vec::new() })
            })
            .collect::<HashMap<String, Conversion>>()
    );

    //write conversion to file
    let file = File::create(&conversion_location)?;
    let mut writer = BufWriter::new(file);
    serde_json::to_writer(&mut writer, &conversion_json)?;
    writer.flush()?;

    Ok(true)
}

#[cfg(test)]
mod tests {
    use serde_json::Value;

    use super::*;

    #[test]
    fn test_generate_receipt_email() {
        let conversion = vec![("Start2Art".to_string(), "1".to_string())].into_iter().collect();

        let uploads = vec![
            Upload {
                id: "1".to_string(),
                lib_name: "lib1".to_string(),
                file_name: "file1".to_string(),
            },
            Upload {
                id: "2".to_string(),
                lib_name: "lib2".to_string(),
                file_name: "file2".to_string(),
            }
        ];

        let receipt = generate_receipt_email(&conversion, &uploads);

        assert_eq!(receipt.contains("Start2Art: 1"), true);
        assert_eq!(receipt.contains("lib1: file1"), true);
        assert_eq!(receipt.contains("lib2: file2"), true);
    }

    #[test]
    fn test_generate_samples_file() {
        let uploads = vec![
            Upload {
                id: "1".to_string(),
                lib_name: "lib1".to_string(),
                file_name: "file1".to_string(),
            },
            Upload {
                id: "2".to_string(),
                lib_name: "lib2".to_string(),
                file_name: "file2".to_string(),
            }
        ];

        let samples_file_location = "samples.json";
        let _ = generate_samples_file(&uploads, samples_file_location);

        let file = std::fs::read_to_string(samples_file_location).unwrap();
        let samples_json: Value = serde_json::from_str(&file).unwrap();

        assert_eq!(samples_json["samples"][0], "lib1/file1");
        assert_eq!(samples_json["samples"][1], "lib2/file2");

        let _ = std::fs::remove_file(samples_file_location);
    }

    #[test]
    fn test_write_conversion_to_file() {
        let mut conversion: HashMap<String, String> = HashMap::new();
        conversion.insert("CAP188".to_string(), "123".to_string());
        let conversion_location = "./conversion.json";
        let wrote_conversion = write_conversion_to_file(conversion, conversion_location);
        assert_eq!(wrote_conversion.unwrap(), true);

        //delete file at conversion_location
        let _ = std::fs::remove_file(conversion_location);
    }
}
