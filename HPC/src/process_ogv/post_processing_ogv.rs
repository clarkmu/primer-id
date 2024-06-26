use std::{ collections::HashMap, fs::File, io::{ BufWriter, Write } };
use crate::{ compress::compress_dir, pipeline::{ OgvAPI, Pipeline } };
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
    let job_id = if pipeline.data.job_id.is_empty() {
        format!("ogv-results_{}", &pipeline.data.id)
    } else {
        pipeline.data.job_id.clone()
    };
    let (location, compressed_filename) = compress_dir(
        &pipeline.data.results_format,
        &job_id,
        &results_location,
        &pipeline.scratch_dir
    ).context("Failed to compress files.")?;

    // upload and get signed url to compressed results
    pipeline
        .bucket_upload(&location.display().to_string(), &compressed_filename)
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
}
