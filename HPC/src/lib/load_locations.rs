use std::ops::Index;
use serde::{ Serialize, Deserialize };
use anyhow::{ Context, Result };

use crate::load_env_vars::{ load_env_vars, EnvVars };

static LOCATIONS_FILE: &'static [u8] = include_bytes!("../../locations.json");
static LOCATIONS_FILE_DEV: &'static [u8] = include_bytes!("../../locations.dev.json");
static LOCATIONS_FILE_TEST: &'static [u8] = include_bytes!("../../locations.test.json");

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct PipelineKeys {
    pub base: String,
    pub ogv: String,
    pub tcs: String,
    pub intact: String,
    pub coreceptor: String,
}

#[derive(Clone, Copy)]
pub enum PipelineType {
    Base,
    Ogv,
    Tcs,
    Intact,
    Coreceptor,
}

impl Index<PipelineType> for PipelineKeys {
    type Output = String;
    fn index(&self, index: PipelineType) -> &Self::Output {
        match index {
            PipelineType::Base => &self.base,
            PipelineType::Ogv => &self.ogv,
            PipelineType::Tcs => &self.tcs,
            PipelineType::Intact => &self.intact,
            PipelineType::Coreceptor => &self.coreceptor,
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
    pub coreceptor_base_path: String,
    pub intactness_base_path: String,
    pub api_key: String,
    pub smtp_address: String,
    pub smtp_port: u16,
    pub tcs_log_bucket_url: String,
}

pub fn load_locations() -> Result<Locations> {
    let EnvVars { is_dev, is_test, .. } = load_env_vars();

    let locations: Locations = serde_json
        ::from_slice(
            if is_dev {
                LOCATIONS_FILE_DEV
            } else if is_test {
                LOCATIONS_FILE_TEST
            } else {
                LOCATIONS_FILE
            }
        )
        .context("Failed to load locations.")?;

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
        assert!(locations.api_url[PipelineType::Coreceptor].contains("api"));
    }
}
