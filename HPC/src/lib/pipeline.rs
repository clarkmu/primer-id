use crate::{
    cloud_storage::{ download, get_signed_url, upload },
    email_templates::{
        generate_ogv_receipt,
        generate_splicing_receipt,
        generate_tcs_receipt,
        receipt_email_template,
    },
    get_api::get_api,
    load_locations::{ load_locations, PipelineType },
    send_email::send_email,
};
use chrono::prelude::*;
use reqwest::Client;
use serde::{ Deserialize, Serialize };
use serde_json::json;
use serde_json::Value;
use std::io::Write;
use std::path::PathBuf;
use std::{ collections::HashMap, fs::OpenOptions };

use anyhow::{ Context, Result };

// TODO reorganize this huge file
//   maybe create ./apis/TCS|OGV|Intact
//     - include the API struct and impl Pipeline<API> there

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

#[derive(Deserialize, Debug, Clone)]
pub struct SplicingAPI {
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

    pub strain: String,
    pub assay: String,
    pub distance: u8,
    pub sequence: String,

    pub htsf: Option<String>,
    #[serde(rename = "poolName")]
    pub pool_name: Option<String>,
    pub uploads: Option<Vec<TcsUpload>>,
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
    pub indel: Option<bool>,
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

impl<ApiData> Pipeline<ApiData> where ApiData: for<'de> serde::Deserialize<'de> {
    pub async fn new(id: String, pipeline_type: PipelineType) -> Result<Pipeline<ApiData>> {
        let locations = load_locations().unwrap();

        let api_url: String = String::from(&locations.api_url[pipeline_type]);

        let url = format!("{}/{}", &api_url, &id);
        let data: ApiData = get_api(&url).await.unwrap_or_else(|e| {
            // try again later
            println!("Error getting API: {:?}", e);
            std::process::exit(1);
        });

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

        let pipeline: Pipeline<ApiData> = Pipeline {
            id,
            base: locations.base.clone(),
            scratch_dir,
            log_file,
            log_error_file,
            api_url,
            bucket_url,
            api_key: locations.api_key.clone(),
            data,
        };

        Ok(pipeline)
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

    pub async fn patch_pending(&self) -> Result<()> {
        let data = json!({"pending": true, "submit": false});

        let url = format!("{}/{}", &self.api_url, &self.id);

        Client::new()
            .patch(url)
            .json(&data)
            .header("x-api-key", &self.api_key)
            .send().await
            .context("Failed to patch pipeline as pending.")?;

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

impl Pipeline<TcsAPI> {
    pub fn is_dr(&self) -> bool {
        let temp_primers = self.data.primers.clone().unwrap_or(vec![]);
        temp_primers.is_empty()
    }
    pub fn pool_name(&self) -> String {
        let is_dr = self.is_dr();
        let temp_pool_name = self.data.pool_name.clone().unwrap_or("".to_string());
        let pool_name = if is_dr || temp_pool_name.is_empty() {
            "TCSDR".to_string()
        } else {
            temp_pool_name
        };
        pool_name
    }
    pub fn job_id(&self) -> String {
        let is_dr = self.is_dr();
        let pool_name = self.pool_name();
        let job_id: String = format!("{}_{}", if is_dr { "dr" } else { "tcs" }, &pool_name);
        job_id
    }
    pub async fn send_receipt(&self) -> Result<()> {
        let is_dr = self.is_dr();
        let job_id = self.job_id();
        let subject = &format!("{} Submission #{}", if is_dr { "DR" } else { "TCS" }, &job_id);
        let msg: String = generate_tcs_receipt(&self.data);
        let _ = send_email(&subject, &msg, &self.data.email, true).await.context(
            "Failed to send receipt email."
        )?;
        Ok(())
    }
    pub fn cores_and_memory(&self, upload_count: &Option<u8>) -> (u8, u32) {
        // run max 10 single-threaded pairs per submission
        // allocate 25gb memory per pair

        let mut cores = upload_count.unwrap_or(0) / 2;
        if cores < 1 {
            cores = 1;
        }
        cores = std::cmp::min(cores, 9);

        let memory: u32 = 25000 * (cores as u32);

        (cores, memory)
    }
}

impl Pipeline<CoreceptorAPI> {
    pub fn job_id(&self) -> String {
        let job_id: String = if self.data.job_id.is_empty() {
            format!("coreceptor_{}", &self.data.id)
        } else {
            self.data.job_id.clone()
        };
        job_id
    }
    pub async fn send_receipt(&self) -> Result<()> {
        let job_id = self.job_id();

        let sequences_html = format!(
            "<u>Sequences</u></br>{}",
            &self.data.sequences
                .split("\n")
                .filter(|line| line.starts_with(">"))
                .map(|l| l.replace(">", ""))
                .collect::<Vec<String>>()
                .join("</br>")
        );
        let receipt_body = receipt_email_template(&sequences_html);

        send_email(
            &format!("Coreceptor Submission #{}", &job_id),
            &receipt_body,
            &self.data.email,
            true
        ).await.context("Failed to send receipt email.")?;

        Ok(())
    }
    pub fn cores_and_memory(&self) -> (u8, u32) {
        // run single-threaded, don't overload g2p
        // allocate 5gb memory per job

        let cores = 1;
        let memory: u32 = 5000;

        (cores, memory)
    }
}

impl Pipeline<OgvAPI> {
    pub fn job_id(&self) -> String {
        let job_id: String = if self.data.job_id.is_empty() {
            format!("ogv_{}", &self.data.id)
        } else {
            self.data.job_id.clone()
        };
        job_id
    }
    pub async fn send_receipt(&self) -> Result<()> {
        let job_id = self.job_id();
        let receipt_body = generate_ogv_receipt(&self.data);
        send_email(
            &format!("OGV Dating Submission #{}", &job_id),
            &receipt_body,
            &self.data.email,
            true
        ).await.context("Failed to send receipt email.")?;

        Ok(())
    }
    pub fn cores_and_memory(&self) -> (u8, u32) {
        // allocate 5 GiB per core, capped at 20 cores
        let cores = std::cmp::min(self.data.uploads.len() as u8, 20);

        let memory: u32 = (cores as u32) * 5000;

        (cores, memory)
    }
}

impl Pipeline<IntactAPI> {
    pub fn job_id(&self) -> String {
        let job_id: String = if self.data.job_id.is_empty() {
            format!("intactness_{}", &self.data.id)
        } else {
            self.data.job_id.clone()
        };
        job_id
    }
    pub async fn send_receipt(&self) -> Result<()> {
        let job_id = self.job_id();

        let sequences_html = format!(
            "<u>Sequences</u></br>{}",
            &self.data.sequences
                .split("\n")
                .filter(|line| line.starts_with(">"))
                .map(|l| l.replace(">", ""))
                .collect::<Vec<String>>()
                .join("</br>")
        );
        let receipt_body = receipt_email_template(&sequences_html);

        send_email(
            &format!("Intactness Submission #{}", &job_id),
            &receipt_body,
            &self.data.email,
            true
        ).await.context("Failed to send receipt email.")?;

        Ok(())
    }
    pub fn cores_and_memory(&self, upload_count: Option<u8>) -> (u8, u32) {
        // run up to 9 threads, 20gb per thread

        let paired_jobs = upload_count.unwrap_or(0) / 2;

        let mut cores = paired_jobs;
        if cores < 1 {
            cores = 1;
        }
        cores = std::cmp::min(cores, 9);

        let memory: u32 = 20000 * (cores as u32);

        (cores, memory)
    }
}

impl Pipeline<SplicingAPI> {
    pub fn job_id(&self) -> String {
        let pool_name = self.data.pool_name.clone().unwrap_or("".to_string());
        let job_id: String = if pool_name.is_empty() {
            format!("splicing_{}", &self.data.id)
        } else {
            pool_name
        };
        job_id
    }
    pub async fn send_receipt(&self) -> Result<()> {
        let job_id = self.job_id();
        let receipt_body = generate_splicing_receipt(&self.data);
        send_email(
            &format!("Splicing Submission #{}", &job_id),
            &receipt_body,
            &self.data.email,
            true
        ).await.context("Failed to send receipt email.")?;

        Ok(())
    }
    pub fn cores_and_memory(&self) -> (u8, u32) {
        // TODO: cores and memory are hardcoded in splicing repo

        let cores = 4;
        let memory: u32 = 20000;

        (cores, memory)
    }
}

pub fn pipeline_is_stale<'a>(
    pending: &bool,
    date: &'a str,
    time_limit_in_hours: i64
) -> (bool, String) {
    if !pending {
        return (false, String::from(""));
    }

    // parse date as saved in MongoDB
    let created_at = NaiveDateTime::parse_from_str(date, "%Y-%m-%dT%H:%M:%S%.fZ")
        .context("Failed to parse created_at.")
        .unwrap();
    let now = Utc::now().naive_utc();
    let diff = now - created_at;
    let is_stale = diff.num_hours() > time_limit_in_hours;
    let is_stale_cmd = String::from(if is_stale { " --is_stale" } else { "" });
    (is_stale, is_stale_cmd)
}

#[cfg(test)]
mod tests {
    use crate::load_locations::load_locations;

    use super::*;
    use crate::load_locations::PipelineType;

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
