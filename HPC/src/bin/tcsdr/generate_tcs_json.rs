use utils::pipeline::{ Primer, TcsAPI };
use anyhow::{ Context, Result };

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct TcsJson {
    raw_sequence_dir: String,
    platform_error_rate: f32,
    platform_format: u16,
    primer_pairs: Vec<Primer>,
}

/// Apply legacy/compat field mappings from the incoming primer record to the JSON primer.
/// This keeps the “workaround” in one place instead of scattered in business logic.
fn primer_for_tcs_json(primer: &Primer) -> Primer {
    let mut p = primer.clone();

    p.overlap = primer.end_join_overlap;
    p.TCS_QC = Some(primer.qc);

    // copy from the owned clone so the source data remains untouched
    p.trim_ref = p.trim_genome.clone();

    p.trim_ref_start = primer.trim_start;
    p.trim_ref_end = primer.trim_end;
    p.indel = Some(primer.allow_indels);

    p
}

pub fn generate_tcs_json(data: &TcsAPI, dir: &str, name: &str) -> Result<String> {
    let out_path = format!("{dir}/params_{name}.json");

    // clone the primers so we never mutate the source data
    let primer_pairs: Vec<Primer> = data.primers
        .clone()
        .unwrap_or_default()
        .iter()
        .map(primer_for_tcs_json)
        .collect();

    let tcs_json = TcsJson {
        // Keep your test behavior (raw_sequence_dir == dir), but consider renaming this field.
        raw_sequence_dir: dir.to_owned(),
        platform_error_rate: data.error_rate.unwrap_or(0.0),
        platform_format: data.platform_format.unwrap_or(0),
        primer_pairs,
    };

    let json = serde_json::to_string(&tcs_json).context("Failed to serialize TcsJson.")?;
    std::fs::write(&out_path, json).context("Failed to write TcsJson to file.")?;

    Ok(out_path)
}

// TODO write test when i get updated virust-tcs params and tcs has a log validator
