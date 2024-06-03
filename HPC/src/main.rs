#![allow(unused_imports, dead_code, unused_variables)]

// RUST_BACKTRACE=1 cargo watch -c -w src -x 'run -- --is_dev' --poll

use std::{ env, process::exit };

mod pipeline;
mod process_ogv;

mod load_locations {
    use std::ops::Index;
    use std::slice::SliceIndex;
    use std::{ fs::File, io::Read };
    use std::io::BufReader;
    use std::path::Path;
    use serde_json::Value;
    use std::collections::HashMap;
    use serde::{ Serialize, Deserialize };

    #[derive(Serialize, Deserialize, Debug, Clone)]
    pub struct PipelineKeys {
        pub base: String,
        pub ogv: String,
        pub tcs: String,
        pub intact: String,
    }

    impl Index<&str> for PipelineKeys {
        type Output = String;
        fn index(&self, index: &str) -> &Self::Output {
            match index {
                "ogv" => &self.ogv,
                "tcs" => &self.tcs,
                "intact" => &self.intact,
                _ => panic!("Invalid PipelineKeys key."),
            }
        }
    }

    #[derive(Serialize, Deserialize, Debug, Clone)]
    pub struct Locations {
        pub admin_email: String,
        pub tilda: String,
        pub base: String,
        pub private_key_location: String,
        pub ruby_server: String,
        pub log_dir: PipelineKeys,
        pub scratch_space: PipelineKeys,
        pub api_url: PipelineKeys,
        pub bucket_url: PipelineKeys,
        pub is_dev: Option<bool>,
        pub ogv_base_path: String,
        pub intactness_base_path: String,
    }

    pub fn read(file_path: &str, is_dev: bool) -> Result<Locations, Box<dyn std::error::Error>> {
        let file = File::open(file_path)?;
        let reader = BufReader::new(file);
        let mut json: Locations = serde_json::from_reader(reader)?;
        json.is_dev = Some(is_dev);

        Ok(json)
    }
}

mod lock_file {
    use std::fs::{ self, File };
    use std::error::Error;
    use std::path::Path;
    pub struct LockFile {
        file_path: String,
    }

    impl LockFile {
        pub fn new(file_path: String) -> LockFile {
            LockFile {
                file_path,
            }
        }
        pub fn create(&self) -> Result<(), Box<dyn Error>> {
            // fs::create_dir_all(&self.file_path)?;
            File::create(&self.file_path)?;
            Ok(())
        }
        pub fn delete(&self) -> Result<(), Box<dyn Error>> {
            fs::remove_file(&self.file_path)?;
            Ok(())
        }
        pub fn exists(&self) -> Result<bool, Box<dyn Error>> {
            if fs::metadata(&self.file_path).is_ok() { Ok(true) } else { Ok(false) }
        }
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<String> = env::args().collect();
    let is_dev = args.iter().any(|e| e.contains("is_dev"));

    let locations_file = if is_dev { "./locations.dev.json" } else { "./locations.json" };
    let locations = load_locations::read(locations_file, is_dev)?;

    // let lock_file = lock_file::LockFile::new(format!("{}/lock_process", &locations.base));
    // if lock_file.exists()? {
    //     println!("\n\nProcess currently running.\nExiting.\n\n");
    //     std::process::exit(1);
    // } else {
    //     lock_file.create()?;
    // }

    process_ogv::init(locations.clone()).await?;

    // lock_file.delete()?;

    Ok(())
}
