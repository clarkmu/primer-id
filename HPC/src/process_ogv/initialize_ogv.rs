use std::io::Write;
use std::fs::OpenOptions;
use std::collections::HashMap;
use crate::pipeline::{ Pipeline, Upload };
use serde_json::Value;

pub async fn initialize_run(pipeline: Pipeline) -> Result<(), Box<dyn std::error::Error>> {
    //email receipt
    let _ = pipeline.add_log("Emailing receipt.");
    let receipt = generate_receipt(&pipeline.data.conversion, &pipeline.data.uploads).await;
    let _ = pipeline.send_email(&"OGV-Dating Submission", &receipt, true).await;

    //transfer files
    let result = download_files(&pipeline);

    //generate samples file
    let samples_file_location = format!("{}/samples.json", &pipeline.scratch_dir);
    generate_samples_file(&pipeline.data.uploads.clone(), &pipeline, &samples_file_location)?;

    //run OGV
    let run_pipeline_command: String = format!(
        "conda run -n ogv snakemake --cores 4 --config job_dir='{}/' --configfile {} --directory {}/ --keep-going --snakefile {}/Snakefile",
        &pipeline.job_dir,
        samples_file_location,
        &pipeline.ogv_base_path,
        &pipeline.ogv_base_path
    );

    let _ = pipeline.init_sbatch(run_pipeline_command, "/usr/bin/env python");

    // pipeline.patch_pipeline(serde_json::json!({"pending": true, "submit": false}));

    Ok(())
}

async fn generate_receipt(conversion: &HashMap<String, String>, uploads: &Vec<Upload>) -> String {
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

fn download_files(pipeline: &Pipeline) -> Result<(), Box<dyn std::error::Error>> {
    let data_dir = format!("{}/data", &pipeline.scratch_dir);

    // if data_dir does not exist, create it
    if !std::path::Path::new(&data_dir).exists() {
        let _ = std::fs::create_dir_all(&data_dir);
    }

    // let output_pattern: &str = &format!("{}/**/*.fasta", &pipeline.scratch_dir);

    // let c = glob::glob(output_pattern).into_iter().count();

    // // dbg!(c, output_pattern, &glob::glob(output_pattern).into_iter());

    // if glob::glob(output_pattern).into_iter().count() > 0 {
    //     return Ok(());
    // }

    let cmd = format!("gsutil cp -r {}/{}/* {}", &pipeline.bucket_url, &pipeline.data.id, data_dir);
    pipeline.run_command(&cmd, "", "")?;

    Ok(())
}

fn generate_samples_file(
    uploads: &Vec<Upload>,
    pipeline: &Pipeline,
    samples_file_location: &str
) -> Result<(), Box<dyn std::error::Error>> {
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
        .unwrap();

    if let Err(e) = writeln!(file, "{}", serde_json::to_string(&samples_json).unwrap()) {
        eprintln!("Couldn't write to file: {}", e);
    }

    Ok(())
}
