use std::ops::Index;
use std::fs::File;
use std::io::BufReader;
use serde::{ Serialize, Deserialize };
use anyhow::Result;

use crate::load_env_vars::{ load_env_vars, EnvVars };

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct PipelineKeys {
    pub base: String,
    pub ogv: String,
    pub tcs: String,
    pub intact: String,
}

#[derive(Clone, Copy)]
pub enum PipelineType {
    Base,
    Ogv,
    Tcs,
    Intact,
}

impl Index<PipelineType> for PipelineKeys {
    type Output = String;
    fn index(&self, index: PipelineType) -> &Self::Output {
        match index {
            PipelineType::Base => &self.base,
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
    pub ogv_base_path: String,
    pub intactness_base_path: String,
    pub api_key: String,
}

pub fn load_locations() -> Result<Locations> {
    let EnvVars { is_dev, .. } = load_env_vars();

    let locations_file: &str = if is_dev { "./locations.dev.json" } else { "./locations.json" };

    let file = File::open(locations_file)?;
    let reader = BufReader::new(file);
    let locations: Locations = serde_json::from_reader(reader)?;

    Ok(locations)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_read() {
        let locations: Locations = load_locations().unwrap();

        assert!(locations.api_url[PipelineType::Ogv].contains("api"));
        assert!(locations.api_url[PipelineType::Tcs].contains("api"));
        assert!(locations.api_url[PipelineType::Intact].contains("api"));
    }
}
