use std::{ collections::HashMap, fs::OpenOptions };
use crate::{
    cloud_storage::{ download, get_signed_url, upload },
    load_locations::{ Locations, PipelineType },
    send_email::send_email,
};
use serde::{ Deserialize, Serialize };
use serde_json::Value;
use chrono::prelude::*;
use std::path::PathBuf;
use std::io::Write;
use reqwest::Client;
use serde_json::json;

use anyhow::{ Context, Result };

#[derive(Deserialize, Debug, Clone)]
pub struct OgvUpload {
    // pub id: String,
    #[serde(rename = "fileName")]
    pub file_name: String,
    #[serde(rename = "libName")]
    pub lib_name: String,
}

#[derive(Deserialize, Debug, Clone)]
pub struct OgvAPI {
    pub id: String,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "jobID")]
    pub job_id: String,
    #[serde(rename = "resultsFormat")]
    pub results_format: String,
    pub uploads: Vec<OgvUpload>,
    pub conversion: HashMap<String, String>,
    pub email: String,
    pub submit: bool,
    pub pending: bool,
    #[serde(rename = "processingError")]
    pub processing_error: bool,
}

#[derive(Deserialize, Debug, Clone)]
pub struct IntactAPI {
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
    #[serde(rename = "fileName")]
    pub file_name: String,
    #[serde(rename = "poolName")]
    pub pool_name: String,
}

#[derive(Deserialize, Debug, Clone)]
pub struct CoreceptorAPI {
    pub id: String,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "jobID")]
    pub job_id: String,
    #[serde(rename = "resultsFormat")]
    pub results_format: String,
    pub sequences: String,
    pub email: String,
    pub submit: bool,
    pub pending: bool,
    #[serde(rename = "processingError")]
    pub processing_error: bool,
}

// rename on deserialize only so that ViralSeq can pick up snake_case in params.json files
// no researilization happens to database where camelCase names are needed
#[derive(Deserialize, Serialize, Debug, Clone)]
#[allow(non_snake_case)]
pub struct Primer {
    // pub id: String,
    pub region: String,
    pub supermajority: f32,
    pub forward: String,
    pub cdna: String,
    #[serde(rename(deserialize = "endJoin"))]
    pub end_join: bool,
    #[serde(rename(deserialize = "endJoinOption"))]
    pub end_join_option: Option<u16>,
    #[serde(rename(deserialize = "endJoinOverlap"))]
    pub end_join_overlap: Option<u16>,
    pub qc: bool,
    #[serde(rename(deserialize = "refGenome"))]
    pub ref_genome: Option<String>,
    #[serde(rename(deserialize = "refStart"))]
    pub ref_start: Option<u16>,
    #[serde(rename(deserialize = "refEnd"))]
    pub ref_end: Option<u16>,
    #[serde(rename(deserialize = "allowIndels"))]
    pub allow_indels: bool,
    pub trim: Option<bool>,
    #[serde(rename(deserialize = "trimGenome"))]
    pub trim_genome: Option<String>,
    #[serde(rename(deserialize = "trimStart"))]
    pub trim_start: Option<u16>,
    #[serde(rename(deserialize = "trimEnd"))]
    pub trim_end: Option<u16>,
    pub overlap: Option<u16>,
    pub TCS_QC: Option<bool>,
    pub trim_ref: Option<String>,
    pub trim_ref_start: Option<u16>,
    pub trim_ref_end: Option<u16>,
}

#[derive(Deserialize, Debug, Clone)]
pub struct TcsAPI {
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
            .patch_pipeline(json!({"pending": false, "processingError": true})).await
            .context("Failed to patch pipeline.")?;

        let _ = send_email(subject, msg, to_email, true).await?;

        Ok(())
    }

    pub async fn patch_pipeline(&self, data: Value) -> Result<()> {
        Client::new()
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
        let from_bucket = format!("{}/{}/{}", &self.bucket_url, &self.id, from);
        download(&from_bucket, to_local, download_recursive).context("Failed")?;
        Ok(())
    }

    pub fn bucket_upload(&self, from_local: &str, to: &str) -> Result<()> {
        let to_bucket = format!("{}/{}/{}", &self.bucket_url, &self.id, to);
        upload(from_local, &to_bucket).context("Failed to upload file")?;
        Ok(())
    }

    pub fn bucket_signed_url(&self, location: &str) -> Result<String> {
        let bucket_location = format!("{}/{}/{}", &self.bucket_url, &self.id, location);
        println!("Bucket location for signed url: {}", &bucket_location);
        let signedurl = get_signed_url(&bucket_location).context(
            "Failed to generate signed URL for uploaded file."
        )?;
        Ok(signedurl)
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
            uploads: vec![OgvUpload {
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
