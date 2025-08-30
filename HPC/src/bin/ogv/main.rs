use utils::{
    load_env_vars::{ EnvVars, load_env_vars },
    load_locations::{ Locations, PipelineType, load_locations },
    pipeline::{ OgvAPI, Pipeline },
};

// cargo run --bin ogv -- --id=667af1f0fe90441ac2375c50 --is_dev --is_stale

mod process;

#[tokio::main]
async fn main() -> () {
    let EnvVars { id, is_stale, .. } = load_env_vars();

    let locations: Locations = load_locations().unwrap_or_else(|e| {
        println!("Error loading environment: {:?}", e);
        std::process::exit(1);
    });

    let pipeline: Pipeline<OgvAPI> = match Pipeline::new(id.clone(), PipelineType::Ogv).await {
        Ok(p) => p,
        Err(e) => {
            println!("Error creating pipeline: {:?}", e);
            std::process::exit(1);
        }
    };

    // placed process is_stale here because pipeline is already set up , left it out of process_queue.main
    if !is_stale.is_empty() {
        pipeline
            .add_error(
                &format!("OGV Stale Job: {}", &id),
                "Pipeline has been pending for over 36 hours and has been cancelled.",
                &pipeline.data.email
            ).await
            .unwrap_or_else(|e| {
                println!("Failed to add error: {:?}", e);
                std::process::exit(1);
            });
        return ();
    }

    if let Err(e) = process::process(&pipeline, locations).await {
        pipeline
            .add_error(
                &format!("OGV Processing Error"),
                &format!("Failed to process OGV pipeline #{}.\n\n{:?}", &pipeline.id, e),
                &pipeline.data.email
            ).await
            .unwrap_or_else(|e| {
                println!("Failed to add error: {:?}", e);
                std::process::exit(1);
            });
    }
}
