use std::{ collections::HashMap, fs::OpenOptions };
use crate::load_locations::{ Locations, PipelineType };
use serde::Deserialize;
use serde_json::Value;
use chrono::prelude::*;
use std::path::PathBuf;
use std::io::Write;
use lettre::{ message::{ header::{ self, ContentType }, Mailboxes, Message }, SmtpTransport };
use anyhow::{ Context, Result };

#[derive(serde::Deserialize, Debug, Clone)]
pub struct Upload {
    #[serde(rename = "_id")]
    pub id: String,
    #[serde(rename = "fileName")]
    pub file_name: String,
    #[serde(rename = "libName")]
    pub lib_name: String,
}

#[derive(serde::Deserialize, Debug, Clone)]
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

#[derive(serde::Deserialize, Debug, Clone)]
pub struct TcsAPI {}

#[derive(serde::Deserialize, Debug, Clone)]
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
    pub sequence: String,
}

#[derive(Debug, Deserialize, Clone)]
pub struct Pipeline<ApiData> {
    pub id: String,
    email: String,
    pub is_dev: bool,
    pub base: String,
    pub scratch_dir: String,
    slurm_job_name: String,
    slurm_output: String,
    log_file: String,
    log_error_file: String,
    pub data: ApiData,
    pub ogv_base_path: String,
    private_key_location: String,
    api_url: String,
    bucket_url: String,
    admin_email: String,
    api_key: String,
}

impl<ApiData> Pipeline<ApiData> {
    pub fn new(
        id: String,
        email: String,
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
        let slurm_job_name: String = format!("job_{}", id);
        let slurm_output: String = format!("{}/{}.output", &locations.log_dir[pipeline_type], id);

        let log_file_path = PathBuf::from(&log_file);
        let log_error_path = PathBuf::from(&log_error_file);

        let _ = std::fs::create_dir_all(&PathBuf::from(&scratch_dir));
        let _ = std::fs::create_dir_all(log_file_path.parent().unwrap());
        let _ = std::fs::create_dir_all(log_error_path.parent().unwrap());

        Pipeline {
            id,
            email,
            is_dev: locations.is_dev.unwrap(),
            base: locations.base.clone(),
            scratch_dir,
            log_file,
            log_error_file,
            slurm_job_name,
            slurm_output,
            ogv_base_path: locations.ogv_base_path.clone(),
            api_url,
            bucket_url,
            private_key_location: locations.private_key_location.clone(),
            admin_email: locations.admin_email.clone(),
            api_key: locations.api_key.clone(),
            data,
        }
    }

    pub fn run_command(&self, cmd: &str, current_dir: &str) -> Result<()> {
        self.add_log(&format!("Exec: {:?}", &cmd))?;

        let dir = if current_dir.is_empty() { &self.base } else { current_dir };

        let commands: Vec<&str> = cmd.split(" ").collect::<Vec<&str>>();
        let program: &str = commands[0];
        let args: Vec<&str> = commands[1..].to_vec();

        std::process::Command::new(program).args(args).current_dir(dir).status()?;

        Ok(())
    }

    pub fn add_log(&self, msg: &str) -> Result<()> {
        let date = Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Secs, true);
        let message = format!("[{}] {}", date, msg).to_string();

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

    pub async fn add_error(&self, subject: &str, msg: &str) -> Result<()> {
        let mut file = OpenOptions::new()
            .write(true)
            .append(true)
            .create(true)
            .open(&self.log_error_file)?;

        if let Err(e) = writeln!(file, "{}", &msg) {
            eprintln!("Couldn't write to file: {}", e);
        }

        let _ = self.add_log(&msg);

        let _ = self.patch_pipeline(serde_json::json!({"processingError": true}));

        let _ = self.send_email(subject, &msg, true).await;

        Ok(())
    }

    pub async fn patch_pipeline(&self, data: Value) -> Result<()> {
        reqwest::Client
            ::new()
            .patch(&self.api_url)
            .json(&serde_json::json!({"_id": self.id, "patch": data}))
            .header("x-api-key", &self.api_key)
            .send().await
            .context("Failed to patch pipeline.")?;

        Ok(())
    }

    pub async fn send_email(&self, subject: &str, body: &str, include_admin: bool) -> Result<()> {
        if self.is_dev {
            println!("Email: {} - {}", subject, body);
            return Ok(());
        }

        let mut to = String::from(self.email.clone());

        if include_admin {
            to.push_str(&format!(", {}", &self.admin_email));
        }

        let mailboxes: Mailboxes = to.parse()?;
        let to_header: header::To = mailboxes.into();

        //todo from and SmtpTransport::relay
        let _email = Message::builder()
            .from("".parse()?)
            .mailbox(to_header)
            .subject(subject)
            .header(ContentType::TEXT_HTML)
            .body(String::from(body))?;

        let _mailer = SmtpTransport::relay("")?.build();

        Ok(())
    }

    pub fn init_sbatch(&self, mut cmd: String) -> Result<()> {
        if self.is_dev {
            cmd = format!("tsp -L {} {}", self.slurm_job_name, &cmd);
        } else {
            cmd = format!(
                "sbatch -o {} -n 4 --job_name='{}' --mem=20000 -t 1440 --wrap='{}'",
                &self.slurm_output,
                &self.slurm_job_name,
                &cmd
            );
        }

        let _ = self.run_command(&cmd, "")?;

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
        self.run_command(&cmd, "")?;
        Ok(())
    }

    pub fn bucket_upload(&self, from_local: &str, to: &str) -> Result<()> {
        let to_bucket = format!("{}/{}/{}", &self.bucket_url, &self.id, to);
        let gs_cp_cmd = format!("gsutil cp {} {}", &from_local, to_bucket);
        self.run_command(&gs_cp_cmd, "")?;
        Ok(())
    }

    pub fn bucket_signed_url(&self, location: &str) -> Result<String> {
        let bucket_location = format!("{}/{}/{}", &self.bucket_url, &self.id, location);

        let args_str = format!("signurl -d 7d {} {}", self.private_key_location, bucket_location);
        let args: Vec<&str> = args_str.split(" ").collect::<Vec<&str>>();

        let url = std::process::Command
            ::new("gsutil")
            .args(args)
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
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

        Ok(format!("https://{}", signed_url))
    }
}

pub async fn get_api<State: for<'de> serde::Deserialize<'de>>(url: &str) -> Result<State> {
    let response = reqwest::get(url).await?;
    let json = response.json::<serde_json::Value>().await?;
    let data: State = serde_json::from_value(json)?;
    Ok(data)
}

#[cfg(test)]
mod tests {
    use crate::load_locations;

    use super::*;

    #[test]
    fn it_implements_ogv() {
        let id = "123".to_string();
        let locations: Locations = load_locations::read("locations.test.json", true).unwrap();

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
        let pipeline: Pipeline = Pipeline::new(data, &locations, PipelineType::Ogv);

        assert_eq!(&pipeline.id, &id);
        assert_eq!(pipeline.data.uploads.len(), 1);
    }

    #[test]
    fn test_it_creates_a_signed_url() {
        let locations: Locations = load_locations::read("locations.dev.json", true).unwrap();
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

        let pipeline: Pipeline = Pipeline::new(data, &locations, PipelineType::Ogv);

        let signed_url = pipeline.bucket_signed_url("ogv-results_jobid.zip").unwrap();
        assert_eq!(signed_url.contains("https://storage.googleapis.com"), true);
    }
}
