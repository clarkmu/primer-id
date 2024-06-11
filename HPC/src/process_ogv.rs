use chrono::{ DateTime, Duration, NaiveDate, NaiveDateTime, TimeZone, Utc };
use serde_json::Value;
use std::{ collections::HashMap, f32::consts::E, ptr::null };
use crate::{
    load_locations::{ self, Locations, PipelineType },
    pipeline::{ self, OgvAPI, Pipeline },
};
use glob::glob;

mod initialize_ogv;

mod post_processing_ogv;

pub async fn init(pipeline: &Pipeline) -> Result<&str, Box<dyn std::error::Error>> {
    let is_first_run =
        pipeline.data.submit && !pipeline.data.pending && !pipeline.data.processing_error;

    if is_first_run {
        pipeline.add_log("Initializing OGV pipeline.")?;
        let initialized: Result<(), Box<dyn std::error::Error>> = initialize_ogv::initialize_run(
            pipeline
        ).await;

        match initialized {
            Ok(_) => {
                pipeline.add_log("OGV pipeline initialized.")?;
            }
            Err(e) => {
                let _ = pipeline.add_error(
                    "OGV-Dating Error",
                    &format!("Error initializing OGV pipeline: {:?}", e)
                ).await?;
            }
        }

        return Ok("init");
    } else {
        let finished_files_pattern: &str = &format!(
            "{}/results/dating/*/*.csv",
            &pipeline.scratch_dir
        );

        let mut unique_lib_names: Vec<String> = pipeline.data.uploads
            .iter()
            .map(|u| u.lib_name.clone())
            .collect();

        // remove duplicates from unique_lib_names
        unique_lib_names.sort();
        unique_lib_names.dedup();

        let processing_finished =
            glob::glob(finished_files_pattern).into_iter().count() == unique_lib_names.len();

        if pipeline.data.pending && processing_finished {
            pipeline.add_log("Pipeline has processed. Wrapping it up.")?;
            let _ = post_processing_ogv::init_post_processing(pipeline).await;
            return Ok("post_processing");
        } else {
            pipeline.add_log("Checking for failure.")?;

            let n = NaiveDateTime::parse_from_str(
                &pipeline.data.created_at,
                "%Y-%m-%dT%H:%M:%S%.fZ"
            ).unwrap();

            let hours = Utc::now().signed_duration_since(Utc.from_utc_datetime(&n)).num_hours();

            if hours > 24 {
                let _ = pipeline.add_error(
                    "OGV-Dating Error",
                    "Pipeline has been pending for over 12 hours."
                ).await?;
                return Ok("stale");
            }

            return Ok("pending");
        }
    }

    Ok("no action")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn ogv_can_be_stale() {
        let locations = load_locations::read("locations.test.json", true).unwrap();

        let data: OgvAPI = OgvAPI {
            id: "123".to_string(),
            created_at: "2024-06-01T15:24:15.766Z".to_string(),
            job_id: "results-named".to_string(),
            results_format: "zip".to_string(),
            uploads: vec![],
            conversion: HashMap::new(),
            email: "".to_string(),
            submit: false,
            pending: true,
            processing_error: false,
        };

        let pipeline: Pipeline = Pipeline::new(data, &locations, PipelineType::Ogv);

        let result = init(&pipeline).await.unwrap();

        assert_eq!(result, "stale");
    }
}
