use std::{
    collections::HashMap,
    fs::File,
    io::{ BufWriter, Write },
    os::unix::process,
    process::Command,
};
use chrono::format;
use crate::{ pipeline::Pipeline };

pub async fn init_post_processing(pipeline: Pipeline) -> Result<(), Box<dyn std::error::Error>> {
    process_conversion(
        pipeline.data.conversion.clone(),
        &pipeline.scratch_dir,
        &pipeline.ogv_base_path
    )?;

    let _ = email_results(pipeline).await;

    // pipeline.patch_api({"pending": false});

    Ok(())
}

fn process_conversion(
    conversion: HashMap<String, String>,
    scratch_dir: &str,
    ogv_base_path: &str
) -> Result<(), Box<dyn std::error::Error>> {
    //ignore non_snake_case
    #[derive(serde::Serialize)]
    #[allow(non_snake_case)]
    struct Conversion {
        Start2Art: i32,
        colors: Vec<i32>,
    }

    let mut conversion_json: HashMap<String, Conversion> = HashMap::new();

    let input_location = format!("{}/conversion.json", &scratch_dir);
    let output_location = format!("{}/results/summary.csv", &scratch_dir);

    conversion.into_iter().for_each(|(k, v)| {
        let value: i32 = v.parse().unwrap();
        let data: Conversion = Conversion { Start2Art: value, colors: Vec::new() };
        conversion_json.insert(k, data);
    });

    //write conversion to file
    let file = File::create(&input_location)?;
    let mut writer = BufWriter::new(file);
    serde_json::to_writer(&mut writer, &conversion_json)?;
    writer.flush()?;

    //run conversion
    let command = format!(
        "python3 {}/result-summary.py -d {} -j {} -o {}",
        &ogv_base_path,
        format!("{}/results/dating/", &scratch_dir),
        &input_location,
        &output_location
    );

    Ok(())
}

async fn email_results(pipeline: Pipeline) -> Result<(), Box<dyn std::error::Error>> {
    let extension: &str = if &pipeline.data.results_format == "tar" { ".tar.gz" } else { ".zip" };
    let results_id = if pipeline.data.job_id.is_empty() {
        &pipeline.data.id
    } else {
        &pipeline.data.job_id
    };
    let filename: String = format!("ogv-results_{}", results_id);
    let compressed_filename = format!("{}{}", filename, extension);

    let location = format!("{}/{}", &pipeline.scratch_dir, &compressed_filename);
    let gs_location = format!(
        "{}/{}/{}",
        &pipeline.bucket_url,
        &pipeline.data.id,
        &compressed_filename
    );

    // if location file exists, delete it
    let _ = std::fs::remove_file(&location);

    if &pipeline.data.results_format == "tar" {
        let output_location = format!("{}/{}", &pipeline.job_dir, "results");

        let tar_command = format!("tar -zcvf {} -C {} .", &location, &output_location);
        pipeline.run_command(&tar_command, &pipeline.scratch_dir, "")?;

        // let _ = std::process::Command
        //     ::new("sh")
        //     .arg(format!("tar -zcvf {} -C {} .", &location, &output_location))
        //     .current_dir(&pipeline.scratch_dir)
        //     .output()?;
    } else {
        let mv_cmd = format!("mv results {}", &filename);
        pipeline.run_command(&mv_cmd, &pipeline.scratch_dir, "")?;

        let zip_cmd = format!("zip -r {} {}", &compressed_filename, &filename);
        pipeline.run_command(&zip_cmd, &pipeline.scratch_dir, "")?;
        // let _ = Command::new("sh")
        //     .arg(format!("mv results {}", &filename))
        //     .current_dir(&pipeline.scratch_dir)
        //     .output()?;

        // let _ = Command::new("sh")
        //     .current_dir(&pipeline.scratch_dir)
        //     .arg(format!("zip -r {} {}", &compressed_filename, &filename))
        //     .output()?;
    }

    let gs_cp_cmd = format!("gsutil cp {} {}", &location, &gs_location);
    pipeline.run_command(&gs_cp_cmd, &pipeline.scratch_dir, "")?;

    // Command::new("sh").arg(format!("gsutil cp {} {}", &location, &gs_location));

    //remove directory location
    let _ = std::fs::remove_dir_all(&location);

    let url = Command::new("sh")
        .arg(format!("gsutil signurl -d 7d {} {}", &pipeline.private_key_location, &gs_location))
        .output()?;

    let command_output = format!("{:?}", &url.stdout);
    let signed_url = command_output.split("https://").collect::<Vec<&str>>().pop().unwrap();

    dbg!(&signed_url);

    let date = chrono::Utc::now().checked_add_signed(chrono::Duration::days(7)).unwrap();

    let download_link = format!(
        "<a href='{}' style='font-size: 16px;'>Download Results</a><br><small>This link expires {}</small>",
        &signed_url,
        date.format("%m/%d/%Y").to_string()
    );

    let mut error: String = String::from("");

    let error_file_location = format!("{}/error", &pipeline.scratch_dir);
    //if error_file_location exists, get file contents
    if std::path::Path::new(&error_file_location).exists() {
        let error_file = std::fs::read_to_string(&error_file_location)?;
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
    let _ = pipeline.send_email(&"OGV-Dating Results", &body, false).await;

    //patch pipeline

    Ok(())
}
