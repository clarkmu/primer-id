use serde_json::Value;
use std::{ collections::HashMap, f32::consts::E, ptr::null };
use crate::{ load_locations::{ self, Locations }, pipeline::{ Pipeline, OgvAPI } };
use glob::glob;

mod initialize_ogv;

mod post_processing_ogv;

pub async fn init(locations: &Locations) -> Result<(), Box<dyn std::error::Error>> {
    let pipeline_type: &str = "ogv";

    let json = reqwest
        ::get(&locations.api_url[pipeline_type]).await
        .unwrap()
        .json::<Vec<Value>>().await?;

    let ogvs: Vec<OgvAPI> = serde_json::from_value(serde_json::Value::Array(json)).unwrap();

    for ogv in ogvs {
        let pipeline: Pipeline = Pipeline::new(ogv, &locations, pipeline_type);

        let is_first_run =
            pipeline.data.submit && !pipeline.data.pending && !pipeline.data.processing_error;

        if is_first_run {
            pipeline.add_log("Initializing OGV pipeline.")?;
            let _ = initialize_ogv::initialize_run(pipeline).await;
        } else {
            let finished_files_pattern: &str = &format!(
                "{}/results/dating/*/*.csv",
                &pipeline.scratch_dir
            );
            let processing_finished =
                glob::glob(finished_files_pattern).into_iter().count() ==
                pipeline.data.uploads.len();

            if pipeline.data.pending && processing_finished {
                pipeline.add_log("Pipeline has processed. Wrapping it up.")?;
                let _ = post_processing_ogv::init_post_processing(pipeline).await;
            } else {
                pipeline.add_log("Checking for failure.")?;
                check_for_fail()?;
            }
        }
    }

    Ok(())
}

fn check_for_fail() -> Result<(), Box<dyn std::error::Error>> {
    //

    Ok(())
}
