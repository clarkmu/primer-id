use std::{ collections::HashMap, fs::File, io::{ BufWriter, Write } };
use crate::pipeline::{ OgvAPI, Pipeline };
use anyhow::{ Result, Context };

pub async fn init_post_processing(pipeline: &Pipeline<OgvAPI>) -> Result<()> {
    let results_location = format!("{}/results", &pipeline.scratch_dir);
    let summary_location = format!("{}/summary.csv", &results_location);
    let conversion_location = format!("{}/conversion.json", &pipeline.scratch_dir);

    //create conversion
    write_conversion_to_file(pipeline.data.conversion.clone(), &conversion_location).context(
        "Failed to create conversion file."
    )?;
    //run conversion
    let command = format!(
        "conda run -n ogv python3 {}/scripts/result-summary.py -d {} -j {} -o {}",
        &pipeline.ogv_base_path,
        format!("{}/results/dating/", &pipeline.scratch_dir),
        &conversion_location,
        &summary_location
    );

    pipeline
        .run_command(&command, &pipeline.scratch_dir)
        .context("Failed to run result-summary.py")?;

    // compress results
    let (location, compressed_filename) = compress_results(&pipeline).context(
        "Failed to compress files."
    )?;

    // upload and get signed url to compressed results
    pipeline
        .bucket_upload(&location, &compressed_filename)
        .context("Failed to upload files to bucket.")?;
    let signed_url = pipeline
        .bucket_signed_url(&compressed_filename)
        .context("Failed to generate a signed url.")?;

    // generate receipt
    let body = generate_receipt(signed_url, &pipeline.scratch_dir).context(
        "Failed to generate an email receipt"
    )?;

    //send email
    pipeline.send_email(&"OGV-Dating Results", &body, false).await?;

    pipeline.patch_pipeline(serde_json::json!({
        "pending": false,
    })).await?;

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

fn compress_results(pipeline: &Pipeline<OgvAPI>) -> Result<(String, String)> {
    let extension: &str = if &pipeline.data.results_format == "tar" { ".tar.gz" } else { ".zip" };
    let results_id = if pipeline.data.job_id.is_empty() {
        &pipeline.data.id
    } else {
        &pipeline.data.job_id
    };
    let filename: String = format!("ogv-results_{}", results_id);
    let compressed_filename = format!("{}{}", filename, extension);

    let location = format!("{}/{}", &pipeline.scratch_dir, &compressed_filename);

    // if location file exists, delete it
    let _ = std::fs::remove_file(&location);

    if &pipeline.data.results_format == "tar" {
        let results_location = format!("{}/{}", &pipeline.scratch_dir, "results");
        let tar_command = format!("tar -zcvf {} -C {} .", &location, &results_location);
        pipeline.run_command(&tar_command, &pipeline.scratch_dir)?;
    } else {
        pipeline.run_command(&format!("cp -r results {}", &filename), &pipeline.scratch_dir)?;
        pipeline.run_command(
            &format!("zip -r {} {}", &compressed_filename, &filename),
            &pipeline.scratch_dir
        )?;
    }

    Ok((location, compressed_filename))
}

fn generate_receipt(signed_url: String, scratch_dir: &str) -> Result<String> {
    let date = chrono::Utc
        ::now()
        .checked_add_signed(chrono::Duration::days(7))
        .ok_or(anyhow::anyhow!("Failed to generate expiration date."))?;

    let download_link = format!(
        "<a href='{}' style='font-size: 16px;'>Download Results</a><br><small>This link expires {}</small>",
        signed_url,
        date.format("%m/%d/%Y").to_string()
    );

    let mut error: String = String::from("");

    let error_file_location = format!("{}/error", scratch_dir);
    //if error_file_location exists, get file contents
    if std::path::Path::new(&error_file_location).exists() {
        let error_file = std::fs
            ::read_to_string(&error_file_location)
            .context("Failed to read error file")?;
        error = format!(
            "<div style='color: lightcoral; padding: 5px; font-weight: bold;'>{}</div>",
            &error_file
        );
    }

    let body = format!(
        "<html><body>Your OGV results are ready for download.<br><br>{}<br><br>{}<br><br></body></html>",
        download_link,
        error
    );

    Ok(body)
}

#[cfg(test)]
mod tests {
    use std::fs::OpenOptions;

    use crate::{ load_locations::{ self, PipelineType }, pipeline::OgvAPI };

    use super::*;

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

    #[test]
    fn test_compresses_tar_unnamed() {
        let locations = load_locations::read("locations.test.json", true).unwrap();

        let data: OgvAPI = OgvAPI {
            id: "123".to_string(),
            created_at: "2024-06-01T15:24:15.766Z".to_string(),
            job_id: "".to_string(),
            results_format: "tar".to_string(),
            uploads: vec![],
            conversion: HashMap::new(),
            email: "".to_string(),
            submit: false,
            pending: true,
            processing_error: false,
        };

        let pipeline: Pipeline<OgvAPI> = Pipeline::new(
            data.id.clone(),
            data.email.clone(),
            data,
            &locations,
            PipelineType::Ogv
        );
        let results_dir = format!("{}/results", &pipeline.scratch_dir);
        let _ = std::fs::create_dir_all(&results_dir);
        let new_file = format!("{}/test.txt", &results_dir);

        //create a test file
        let mut file = OpenOptions::new().write(true).create(true).open(&new_file).unwrap();
        writeln!(file, "{:?}", "test").unwrap();

        // run
        let result = compress_results(&pipeline).unwrap();

        // ensure new compressed file exists
        let new_compressed_file = result.0;
        assert!(new_compressed_file.contains("ogv-results_123.tar.gz"));
        assert_eq!(std::path::Path::new(&new_compressed_file).exists(), true);

        // remove newly created files
        let _ = std::fs::remove_file(&new_file);
        let _ = std::fs::remove_file(&new_compressed_file);
    }

    #[test]
    fn test_compresses_zip_named() {
        let locations = load_locations::read("locations.test.json", true).unwrap();

        let data: OgvAPI = OgvAPI {
            id: "123".to_string(),
            created_at: "2024-06-01T15:24:15.766Z".to_string(),
            job_id: "results-named".to_string(),
            results_format: "zip".to_string(),
            uploads: vec![],
            conversion: HashMap::new(),
            email: "".to_string(),
            submit: false,
            pending: true,
            processing_error: false,
        };

        let pipeline: Pipeline<OgvAPI> = Pipeline::new(
            data.id.clone(),
            data.email.clone(),
            data,
            &locations,
            PipelineType::Ogv
        );
        let results_dir = format!("{}/results", &pipeline.scratch_dir);
        let _ = std::fs::create_dir_all(&results_dir);
        let new_file = format!("{}/test.txt", &results_dir);

        //create a test file
        let mut file = OpenOptions::new().write(true).create(true).open(&new_file).unwrap();
        writeln!(file, "{:?}", "test").unwrap();

        // run
        let result = compress_results(&pipeline).unwrap();

        // ensure new compressed file exists
        let new_compressed_file = result.0;
        assert_eq!(std::path::Path::new(&new_compressed_file).exists(), true);
        assert!(new_compressed_file.contains("ogv-results_results-named.zip"));

        // remove newly created files
        let _ = std::fs::remove_file(&new_file);
        let _ = std::fs::remove_file(&new_compressed_file);
    }
}
