use anyhow::{Context, Result};
use serde::Serialize;
use utils::pipeline::{Primer, TcsAPI};

#[derive(Debug, Serialize)]
pub struct TcsJson {
    raw_sequence_dir: String,
    platform_error_rate: f32,
    platform_format: u16,
    primer_pairs: Vec<ViralSeqPrimer>,
}

#[derive(Debug, Serialize)]
struct ViralSeqPrimer {
    region: String,
    forward: String,
    cdna: String,
    majority: f32,
    indel: bool,
    end_join: bool,
    end_join_option: u16,
    overlap: u16,
    #[serde(rename = "TCS_QC")]
    tcs_qc: bool,
    ref_genome: String,
    ref_start: u16,
    ref_end: u16,
    trim: bool,
    trim_ref: String,
    trim_ref_start: u16,
    trim_ref_end: u16,
}

impl From<&Primer> for ViralSeqPrimer {
    fn from(primer: &Primer) -> Self {
        Self {
            region: primer.region.clone(),
            forward: primer.forward.clone(),
            cdna: primer.cdna.clone(),
            majority: primer.supermajority,
            indel: primer.allow_indels,
            end_join: primer.end_join,
            end_join_option: primer.end_join_option.unwrap_or(0),
            overlap: primer.end_join_overlap.unwrap_or(0),
            tcs_qc: primer.qc,
            ref_genome: primer.ref_genome.clone().unwrap_or_default(),
            ref_start: primer.ref_start.unwrap_or(0),
            ref_end: primer.ref_end.unwrap_or(0),
            trim: primer.trim.unwrap_or(false),
            trim_ref: primer.trim_genome.clone().unwrap_or_default(),
            trim_ref_start: primer.trim_start.unwrap_or(0),
            trim_ref_end: primer.trim_end.unwrap_or(0),
        }
    }
}

pub fn generate_tcs_json(data: &TcsAPI, dir: &str, name: &str) -> Result<String> {
    let out_path = format!("{dir}/params_{name}.json");

    let primer_pairs = data
        .primers
        .as_deref()
        .unwrap_or_default()
        .iter()
        .map(ViralSeqPrimer::from)
        .collect();

    let tcs_json = TcsJson {
        raw_sequence_dir: dir.to_owned(),
        platform_error_rate: data.error_rate.unwrap_or(0.0),
        platform_format: data.platform_format.unwrap_or(0),
        primer_pairs,
    };

    let json = serde_json::to_string(&tcs_json).context("Failed to serialize TcsJson.")?;
    std::fs::write(&out_path, json).context("Failed to write TcsJson to file.")?;

    Ok(out_path)
}
