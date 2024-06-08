use std::{ collections::HashMap, fs::OpenOptions };
use crate::load_locations::{ Locations, PipelineKeys, PipelineType };
use serde::Deserialize;
use serde_json::Value;
use chrono::prelude::*;
use std::path::PathBuf;
use std::io::Write;
use lettre::{
    message::{ header::{ self, ContentType }, Mailbox, Mailboxes, Message, MessageBuilder },
    SmtpTransport,
};
use std::error::Error;

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
struct TcsAPI;
struct IntactAPI;

#[derive(Debug, Deserialize, Clone)]
pub struct Pipeline<ApiData = OgvAPI> {
    pub id: String,
    pub is_dev: bool,
    pub base: String,
    pub scratch_dir: String,
    pub job_dir: String,
    slurm_job_name: String,
    slurm_output: String,
    log_file: String,
    log_error_file: String,
    pub data: ApiData,
    pub ogv_base_path: String,
    pub private_key_location: String,
    api_url: String,
    pub bucket_url: String,
    admin_email: String,
    api_key: String,
}

impl Pipeline {
    pub fn new(data: OgvAPI, locations: &Locations, pipeline_type: PipelineType) -> Pipeline {
        let id: String = data.id.clone();

        let api_url: String = String::from(&locations.api_url[pipeline_type]);
        let bucket_url: String = String::from(&locations.bucket_url[pipeline_type]);

        let scratch_dir: String = format!("{}/{}", &locations.scratch_space[pipeline_type], id);

        let job_dir: String = format!("{}/{}", &locations.scratch_space[pipeline_type], id);
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
        let _ = std::fs::create_dir_all(&PathBuf::from(&job_dir));
        let _ = std::fs::create_dir_all(log_file_path.parent().unwrap());
        let _ = std::fs::create_dir_all(log_error_path.parent().unwrap());

        Pipeline {
            id,
            is_dev: locations.is_dev.unwrap(),
            base: locations.base.clone(),
            scratch_dir,
            job_dir,
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

    pub fn run_command(
        &self,
        cmd: &str,
        current_dir: &str,
        program: &str
    ) -> Result<(), Box<dyn Error>> {
        self.add_log(&format!("Exec: {:?} {:?}", &program, &cmd))?;

        let dir = if current_dir.is_empty() { &self.base } else { current_dir };
        let prog = if program.is_empty() { "bash" } else { program };

        let outp = std::process::Command::new(prog).args(cmd.split(" ")).current_dir(dir).status();

        if outp.is_err() {
            let _ = self.add_error(&format!("Error running pipeline - {:?}", &cmd));
            // return Err(anyhow::anyhow!("Error running pipeline."));
        }

        Ok(())
    }

    pub fn add_log(&self, msg: &str) -> Result<(), Box<dyn Error>> {
        let date = Utc::now().to_string();
        let message = format!("[{}] {}", date, msg).to_string();

        let mut file = OpenOptions::new()
            .write(true)
            .create(true)
            .append(true)
            .open(&self.log_file)
            .unwrap();

        if let Err(e) = writeln!(file, "{:?}", &message) {
            eprintln!("Couldn't write to file: {}", e);
        }

        Ok(())
    }

    pub fn add_error(&self, msg: &str) -> Result<(), Box<dyn Error>> {
        let mut file = OpenOptions::new()
            .write(true)
            .append(true)
            .create(true)
            .open(&self.log_error_file)
            .unwrap();

        if let Err(e) = writeln!(file, "{}", &msg) {
            eprintln!("Couldn't write to file: {}", e);
        }

        let _ = self.add_log(&msg);

        Ok(())
    }

    pub async fn patch_pipeline(&self, data: Value) -> Result<(), Box<dyn Error>> {
        let req = reqwest::Client
            ::new()
            .patch(&self.api_url)
            .json(&serde_json::json!({"_id": self.data.id, "patch": data}))
            .header("x-api-key", &self.api_key)
            .send().await;

        match req {
            Ok(_) => (),
            Err(e) => {
                let _ = self.add_error(&format!("Error patching pipeline - {:?}", e));
                // return Err(anyhow::anyhow!("Error patching pipeline."));
            }
        }

        Ok(())
    }

    pub async fn send_email(
        &self,
        subject: &str,
        body: &str,
        include_admin: bool
    ) -> Result<(), Box<dyn Error>> {
        if self.is_dev {
            return Ok(());
        }

        let mut to = String::from(self.data.email.clone());

        if include_admin {
            to.push_str(&format!(", {}", &self.admin_email));
        }

        let mailboxes: Mailboxes = to.parse().unwrap();
        let to_header: header::To = mailboxes.into();

        //todo from and SmtpTransport::relay
        let email = Message::builder()
            .from("".parse().unwrap())
            .mailbox(to_header)
            .subject(subject)
            .header(ContentType::TEXT_HTML)
            .body(String::from(body))
            .unwrap();

        let mailer = SmtpTransport::relay("").unwrap().build();

        Ok(())
    }

    pub fn init_sbatch(&self, mut cmd: String, program: &str) -> Result<(), Box<dyn Error>> {
        let forward_program = if self.is_dev { "tsp" } else { "sbatch" };

        if self.is_dev {
            cmd = format!("-L {} {} {}", self.slurm_job_name, &program, &cmd);
        } else {
            cmd = format!(
                "-o {} -n 4 --job_name='{}' --mem=20000 -t 1440 --wrap='{} {}'",
                &self.slurm_output,
                &program,
                &self.slurm_job_name,
                &cmd
            );
        }

        let _ = self.run_command(&cmd, "", &forward_program)?;

        Ok(())
    }
}

pub async fn get_api<State: for<'de> serde::Deserialize<'de>>(
    url: &str
) -> Result<State, Box<dyn std::error::Error>> {
    let json = reqwest::get(url).await.unwrap().json::<Vec<Value>>().await?;

    let data: State = serde_json::from_value(serde_json::Value::Array(json)).unwrap();
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
            uploads: vec![],
            conversion: HashMap::new(),
            email: "".to_string(),
            submit: true,
            pending: false,
            processing_error: false,
        };
        let pipeline: Pipeline = Pipeline::new(data, &locations, PipelineType::Ogv);

        assert_eq!(&pipeline.id, &id);
    }
}
