use std::{ collections::HashMap, fs::OpenOptions };
use crate::{
    load_locations::{ Locations, PipelineType },
    run_command::run_command,
    send_email::send_email,
};
use serde::{ Deserialize, Serialize };
use serde_json::Value;
use chrono::prelude::*;
use std::path::PathBuf;
use std::io::Write;
use std::process::Command;

use anyhow::{ Context, Result };

#[derive(Deserialize, Debug, Clone)]
pub struct Upload {
    #[serde(rename = "_id")]
    pub id: String,
    #[serde(rename = "fileName")]
    pub file_name: String,
    #[serde(rename = "libName")]
    pub lib_name: String,
}

#[derive(Deserialize, Debug, Clone)]
pub struct OgvAPI {
    #[serde(rename = "_id")]
    pub id: String,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "jobID")]
    pub job_id: String,
    #[serde(rename = "resultsFormat")]
    pub results_format: String,
    pub uploads: Vec<Upload>,
    pub conversion: HashMap<String, String>,
    pub email: String,
    pub submit: bool,
    pub pending: bool,
    #[serde(rename = "processingError")]
    pub processing_error: bool,
}

#[derive(Deserialize, Debug, Clone)]
pub struct IntactAPI {
    #[serde(rename = "_id")]
    pub id: String,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "jobID")]
    pub job_id: String,
    #[serde(rename = "resultsFormat")]
    pub results_format: String,
    pub email: String,
    pub submit: bool,
    pub pending: bool,
    #[serde(rename = "processingError")]
    pub processing_error: bool,
    pub sequences: String,
}

#[derive(Deserialize, Debug, Clone)]
pub struct TcsUpload {
    pub id: String,
    #[serde(rename = "fileName")]
    pub file_name: String,
    #[serde(rename = "poolName")]
    pub pool_name: String,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct Primer {
    pub id: String,
    pub region: String,
    pub supermajority: f32,
    pub forward: String,
    pub cdna: String,
    #[serde(rename = "endJoin")]
    pub end_join: bool,
    #[serde(rename = "endJoinOption")]
    pub end_join_option: Option<u16>,
    #[serde(rename = "endJoinOverlap")]
    pub end_join_overlap: Option<u16>,
    pub qc: bool,
    #[serde(rename = "refGenome")]
    pub ref_genome: Option<String>,
    #[serde(rename = "refStart")]
    pub ref_start: Option<u16>,
    #[serde(rename = "refEnd")]
    pub ref_end: Option<u16>,
    #[serde(rename = "allowIndels")]
    pub allow_indels: bool,
    pub trim: bool,
    #[serde(rename = "trimGenome")]
    pub trim_genome: Option<String>,
    #[serde(rename = "trimStart")]
    pub trim_start: Option<u16>,
    #[serde(rename = "trimEnd")]
    pub trim_end: Option<u16>,
}

#[derive(Deserialize, Debug, Clone)]
pub struct TcsAPI {
    #[serde(rename = "_id")]
    pub id: String,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "jobID")]
    pub job_id: String,
    #[serde(rename = "resultsFormat")]
    pub results_format: String,
    pub email: String,
    pub submit: bool,
    pub pending: bool,
    #[serde(rename = "processingError")]
    pub processing_error: bool,
    pub uploads: Option<Vec<TcsUpload>>,
    pub primers: Option<Vec<Primer>>,
    pub dropbox: Option<String>,
    pub htsf: Option<String>,
    pub uploaded: bool,
    #[serde(rename = "errorRate")]
    pub error_rate: Option<f32>,
    #[serde(rename = "platformFormat")]
    pub platform_format: Option<u16>,
    #[serde(rename = "poolName")]
    pub pool_name: Option<String>,
    pub results: Option<String>,
    #[serde(rename = "drVersion")]
    pub dr_version: String,
}

#[derive(Debug, Deserialize, Clone)]
pub struct Pipeline<ApiData> {
    pub id: String,
    pub base: String,
    pub scratch_dir: String,
    log_file: String,
    log_error_file: String,
    pub data: ApiData,
    private_key_location: String,
    api_url: String,
    bucket_url: String,
    api_key: String,
}

impl<ApiData> Pipeline<ApiData> {
    pub fn new(
        id: String,
        data: ApiData,
        locations: &Locations,
        pipeline_type: PipelineType
    ) -> Pipeline<ApiData> {
        let api_url: String = String::from(&locations.api_url[pipeline_type]);
        let bucket_url: String = String::from(&locations.bucket_url[pipeline_type]);

        let scratch_dir: String = format!("{}/{}", &locations.scratch_space[pipeline_type], id);

        let log_file: String = format!("{}/{}.log", &locations.log_dir[pipeline_type], id);
        let log_error_file: String = format!(
            "{}/errors/{}.error",
            &locations.log_dir[pipeline_type],
            id
        );

        let log_file_path = PathBuf::from(&log_file);
        let log_error_path = PathBuf::from(&log_error_file);

        let _ = std::fs::create_dir_all(&PathBuf::from(&scratch_dir));
        let _ = std::fs::create_dir_all(log_file_path.parent().unwrap());
        let _ = std::fs::create_dir_all(log_error_path.parent().unwrap());

        Pipeline {
            id,
            base: locations.base.clone(),
            scratch_dir,
            log_file,
            log_error_file,
            api_url,
            bucket_url,
            private_key_location: locations.private_key_location.clone(),
            api_key: locations.api_key.clone(),
            data,
        }
    }

    pub fn add_log(&self, msg: &str) -> Result<()> {
        let date = Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Secs, true);
        let message = format!("[{}] {}", date, msg).to_string();

        println!("{}", &message);

        let mut file = OpenOptions::new()
            .write(true)
            .create(true)
            .append(true)
            .open(&self.log_file)?;

        if let Err(e) = writeln!(file, "{:?}", &message) {
            eprintln!("Couldn't write to file: {}", e);
        }

        Ok(())
    }

    pub async fn add_error(&self, subject: &str, msg: &str, to_email: &str) -> Result<()> {
        let mut file = OpenOptions::new()
            .write(true)
            .append(true)
            .create(true)
            .open(&self.log_error_file)?;

        if let Err(e) = writeln!(file, "{}", &msg) {
            eprintln!("Couldn't write to file: {}", e);
        }

        let _ = self.add_log(&msg);

        let _ = self
            .patch_pipeline(serde_json::json!({"pending": false, "processing_error": true})).await
            .context("Failed to patch pipeline.")?;

        let _ = send_email(subject, msg, to_email, true).await?;

        Ok(())
    }

    pub async fn patch_pipeline(&self, data: Value) -> Result<()> {
        reqwest::Client
            ::new()
            .patch(format!("{}/{}", &self.api_url, &self.id))
            .json(&data)
            .header("x-api-key", &self.api_key)
            .send().await
            .context("Failed to patch pipeline.")?;

        Ok(())
    }

    pub fn bucket_download(
        &self,
        from: &str,
        to_local: &str,
        download_recursive: bool
    ) -> Result<()> {
        // if data_dir does not exist, create it
        if std::path::Path::new(from).exists() {
            return Ok(());
        }

        //todo count glob , below does not appear to be correct (c=1 when empty directory)
        // else create_dir_all
        // let output_pattern: &str = &format!("{}/**/*.fasta", &pipeline.scratch_dir);
        // let c = glob::glob(output_pattern).into_iter().count();

        let _ = std::fs::create_dir_all(to_local);

        let from_bucket = format!("{}/{}/{}", &self.bucket_url, &self.id, from);

        let recursive = if download_recursive { "-r" } else { "" };

        let cmd: String = format!("gsutil cp {} {} {}", recursive, from_bucket, to_local);
        run_command(&cmd, "")?;
        Ok(())
    }

    pub fn bucket_upload(&self, from_local: &str, to: &str) -> Result<()> {
        let to_bucket = format!("{}/{}/{}", &self.bucket_url, &self.id, to);

        self.add_log(
            &format!("Uploading from local: {}\nUploading to bucket: {}", &from_local, &to_bucket)
        )?;

        let gs_cp_cmd = format!("gsutil cp {} {}", &from_local, to_bucket);
        run_command(&gs_cp_cmd, "")?;
        Ok(())
    }

    pub fn bucket_signed_url(&self, location: &str) -> Result<String> {
        // sample output from gsutil signurl
        // URL     HTTP Method     Expiration      Signed URL
        // gs://bucket/file      GET     2022-10-12 07:25:31     https://storage.googleapis.com/user/file?x-goog-signature=...&x-goog-algorithm=...&x-goog-credential=....&x-goog-date=...&x-goog-signedheaders=...

        let bucket_location = format!("{}/{}/{}", &self.bucket_url, &self.id, location);

        println!("Bucket location for signed url: {}", &bucket_location);

        let args_str = format!(
            "signurl -d 7d -r us-east1 {} {}",
            self.private_key_location,
            bucket_location
        );
        let args: Vec<&str> = args_str.split(" ").collect::<Vec<&str>>();

        let url = Command::new("gsutil")
            .args(args)
            .output()
            .context("Command failed at generate signed url.")?;

        let command_output = String::from_utf8(url.stdout)?;

        let signed_url: String = command_output
            .split("https://")
            .collect::<Vec<&str>>()
            .pop()
            .context("Failed to generate signed url. API may have changed.")?
            .trim()
            .to_string();

        if !signed_url.contains("storage.googleapis.com") {
            println!("Signed URL failure: {}", &signed_url);
            return Err(anyhow::anyhow!("Failed to generate signed url. API may have changed."));
        }

        Ok(format!("https://{}", signed_url))
    }
}

pub fn pipeline_is_stale(date: &str) -> Result<bool> {
    // parse date as saved in MongoDB
    let created_at = NaiveDateTime::parse_from_str(date, "%Y-%m-%dT%H:%M:%S%.fZ").context(
        "Failed to parse created_at."
    )?;
    let now = Utc::now().naive_utc();
    let diff = now - created_at;
    Ok(diff.num_hours() > 24)
}

#[cfg(test)]
mod tests {
    use crate::load_locations::load_locations;

    use super::*;

    #[test]
    fn it_implements_ogv() {
        let id = "123".to_string();
        let locations: Locations = load_locations().unwrap();

        let data: OgvAPI = OgvAPI {
            id: id.clone(),
            created_at: "2021-01-01".to_string(),
            job_id: "results-named".to_string(),
            results_format: "zip".to_string(),
            uploads: vec![Upload {
                id: "123".to_string(),
                file_name: "file".to_string(),
                lib_name: "lib".to_string(),
            }],
            conversion: HashMap::new(),
            email: "".to_string(),
            submit: true,
            pending: false,
            processing_error: false,
        };
        let pipeline: Pipeline<OgvAPI> = Pipeline::new(
            data.id.clone(),
            data,
            &locations,
            PipelineType::Ogv
        );

        assert_eq!(&pipeline.id, &id);
        assert_eq!(pipeline.data.uploads.len(), 1);
    }

    #[test]
    fn test_it_creates_a_signed_url() {
        let locations: Locations = load_locations().unwrap();
        let data: OgvAPI = OgvAPI {
            id: "630259b6b906884861e0a59d".to_string(),
            created_at: "2021-01-01".to_string(),
            job_id: "jobid".to_string(),
            results_format: "zip".to_string(),
            uploads: vec![Upload {
                id: "123".to_string(),
                file_name: "file".to_string(),
                lib_name: "lib".to_string(),
            }],
            conversion: HashMap::new(),
            email: "".to_string(),
            submit: true,
            pending: false,
            processing_error: false,
        };

        let pipeline: Pipeline<OgvAPI> = Pipeline::new(
            data.id.clone(),
            data,
            &locations,
            PipelineType::Ogv
        );

        let signed_url = pipeline.bucket_signed_url("ogv-results_jobid.zip").unwrap();
        assert_eq!(signed_url.contains("https://storage.googleapis.com"), true);
    }

    #[test]
    fn test_it_parses_signed_url() {
        let sample =
            "URL     HTTP Method     Expiration      Signed URL\ngs://bucket/file      GET     2022-10-12 07:25:31     https://storage.googleapis.com/user/file?x-goog-signature=...&x-goog-algorithm=...&x-goog-credential=....&x-goog-date=...&x-goog-signedheaders=...";

        let signed_url: String = sample
            .split("https://")
            .collect::<Vec<&str>>()
            .pop()
            .expect("")
            .trim()
            .to_string();

        assert_eq!(
            format!("https://{}", signed_url),
            "https://storage.googleapis.com/user/file?x-goog-signature=...&x-goog-algorithm=...&x-goog-credential=....&x-goog-date=...&x-goog-signedheaders=..."
        );
    }
}
