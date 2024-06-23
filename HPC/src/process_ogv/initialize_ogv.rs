use std::io::Write;
use std::fs::OpenOptions;
use std::collections::HashMap;
use crate::pipeline::{ OgvAPI, Pipeline, Upload };
use anyhow::{ Result, Context };

pub async fn initialize_run(pipeline: &Pipeline<OgvAPI>) -> Result<()> {
    //email receipt
    pipeline.add_log("Emailing receipt.")?;
    let receipt = generate_receipt(&pipeline.data.conversion, &pipeline.data.uploads);
    pipeline
        .send_email(&"OGV-Dating Submission", &receipt, true).await
        .context("Failed to send email!")?;

    let download_to: &str = &format!("{}/data", &pipeline.scratch_dir);
    pipeline.bucket_download("*", download_to, true).context("Failed to download bucket files")?;

    //generate samples file
    let samples_file_location = format!("{}/samples.json", &pipeline.scratch_dir);
    generate_samples_file(&pipeline.data.uploads, &samples_file_location).context(
        "Failed to generate samples file."
    )?;

    //run OGV
    let run_pipeline_command: String = format!(
        "conda run -n ogv snakemake --cores 4 --config job_dir='{}/' --configfile {} --directory {}/ --keep-going --snakefile {}/Snakefile",
        &pipeline.scratch_dir,
        samples_file_location,
        &pipeline.ogv_base_path,
        &pipeline.ogv_base_path
    );

    pipeline.init_sbatch(run_pipeline_command)?;

    pipeline
        .patch_pipeline(serde_json::json!({"pending": true, "submit": false})).await
        .context("Failed to patch pipeline.")?;

    Ok(())
}

fn generate_receipt(conversion: &HashMap<String, String>, uploads: &Vec<Upload>) -> String {
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

    let receipt = format!(
        "<html><body>Your OGV submission details are below:<br><br>{}<br><br>{}<br><br>You will receive an email when your results are ready for download.<br><br></body></html>",
        uploads_html,
        conversion_html
    );

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

#[cfg(test)]
mod tests {
    use serde_json::Value;

    use super::*;

    #[test]
    fn test_generate_receipt() {
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

        let receipt = generate_receipt(&conversion, &uploads);

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

    // #[test]
    // fn test_download_files_cmd() {
    //     let id = "1".to_string();
    //     let scratch_dir = "scratch_dir".to_string();
    //     let bucket_url = "bucket_url".to_string();

    //     let cmd = download_files_command(&id, &scratch_dir, &bucket_url);
    //     assert_eq!(cmd, "gsutil cp -r bucket_url/1/* scratch_dir/data");
    // }
}
