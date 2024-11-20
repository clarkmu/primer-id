use utils::pipeline::{ Primer, TcsAPI };
use anyhow::{ Result, Context };

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct TcsJson {
    raw_sequence_dir: String,
    platform_error_rate: f32,
    platform_format: u16,
    primer_pairs: Vec<Primer>,
}

pub fn generate_tcs_json(data: &TcsAPI, dir: &str, name: &str) -> Result<String> {
    let raw_sequence_dir = format!("{}/params_{}.json", dir, name);

    let mut primer_pairs: Vec<Primer> = vec![];

    // adding primers.overlap = primers.overlap_end_join is a terrible workaround for
    //    bypassing creating new structs for this one object.field rename...
    //        a relic of using camelCase vs snake_case in the database/frontend vs where it's actually used
    let primers = data.primers.clone().unwrap_or(vec![]);
    for primer in primers {
        let mut p: Primer = primer.clone();

        p.overlap = primer.end_join_overlap;
        p.TCS_QC = Some(primer.qc);
        p.trim_ref = primer.trim_genome;
        p.trim_ref_start = primer.trim_start;
        p.trim_ref_end = primer.trim_end;

        primer_pairs.push(p);
    }

    let tcs_json = TcsJson {
        raw_sequence_dir: dir.to_string(),
        platform_error_rate: data.error_rate.unwrap_or(0.0),
        platform_format: data.platform_format.unwrap_or(0),
        primer_pairs,
    };

    let json = serde_json::to_string(&tcs_json).context("Failed to serialize TcsJson.")?;
    std::fs::write(&raw_sequence_dir, json).context("Failed to write TcsJson to file.")?;

    Ok(raw_sequence_dir)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_generate_tcs_json() {
        let data: TcsAPI = TcsAPI {
            id: "66b34c687f59f1302b07fbec".to_string(),
            error_rate: Some(0.0),
            platform_format: Some(0),
            primers: Some(vec![]),
            dr_version: "V1".to_string(),
            email: "clarkmu@unc.edu".to_string(),
            // sequences: "test".to_string(),
            htsf: None,
            created_at: "2021-08-10T14:00:00.000Z".to_string(),
            job_id: "test".to_string(),
            pending: false,
            submit: true,
            uploaded: true,
            pool_name: Some("".to_string()),
            results_format: "zip".to_string(),
            processing_error: false,
            dropbox: Some("".to_string()),
            uploads: Some(vec![]),
            results: None,
        };

        let dir = "./tests/fixtures/tcsdr";
        let name = "test";

        let result = generate_tcs_json(&data, dir, name).unwrap();
        assert_eq!(result, format!("{}/params_{}.json", dir, name));

        // read file and assert that data contains TcsJson
        let file = std::fs::read_to_string(&result).unwrap();
        let tcs_json: TcsJson = serde_json::from_str(&file).unwrap();
        assert_eq!(tcs_json.raw_sequence_dir, dir);
    }
}
