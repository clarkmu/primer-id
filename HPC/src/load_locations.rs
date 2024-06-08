use std::ops::Index;
use std::fs::File;
use std::io::BufReader;
use serde::{ Serialize, Deserialize };

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct PipelineKeys {
    pub base: String,
    pub ogv: String,
    pub tcs: String,
    pub intact: String,
}

#[derive(Clone, Copy)]
pub enum PipelineType {
    Ogv,
    Tcs,
    Intact,
}

impl Index<PipelineType> for PipelineKeys {
    type Output = String;
    fn index(&self, index: PipelineType) -> &Self::Output {
        match index {
            PipelineType::Ogv => &self.ogv,
            PipelineType::Tcs => &self.tcs,
            PipelineType::Intact => &self.intact,
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
    pub api_key: String,
}

pub fn read(file_path: &str, is_dev: bool) -> Result<Locations, Box<dyn std::error::Error>> {
    let file = File::open(file_path)?;
    let reader = BufReader::new(file);
    let mut json: Locations = serde_json::from_reader(reader)?;
    json.is_dev = Some(is_dev);

    Ok(json)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_read() {
        let file_path = "locations.dev.json";
        let is_dev = true;
        let locations = read(file_path, is_dev).unwrap();

        assert!(locations.api_url[PipelineType::Ogv].contains("api"));
        assert!(locations.api_url[PipelineType::Tcs].contains("api"));
        assert!(locations.api_url[PipelineType::Intact].contains("api"));
    }
}
