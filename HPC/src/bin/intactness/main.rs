use utils::{
    load_env_vars::{ load_env_vars, EnvVars },
    load_locations::{ load_locations, Locations, PipelineType },
    pipeline::{ IntactAPI, Pipeline },
};

// cargo run --bin intactness -- --id=667af1f0fe90441ac2375c50 --is_dev --is_stale

mod process;
mod split_sequences;

#[tokio::main]
async fn main() -> () {
    let EnvVars { id, is_stale, cores, .. } = load_env_vars();

    let locations: Locations = load_locations().unwrap_or_else(|e| {
        println!("Error loading environment: {:?}", e);
        std::process::exit(1);
    });

    let pipeline: Pipeline<IntactAPI> = match Pipeline::new(id.clone(), PipelineType::Intact).await {
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
                &format!("Stale Intactness Job: {}", &id),
                "Pipeline has been pending for over 24 hours and has been cancelled.",
                &pipeline.data.email
            ).await
            .unwrap_or_else(|e| {
                println!("Failed to add error: {:?}", e);
                std::process::exit(1);
            });
        return ();
    }

    // set thread count for thread pool in processing
    rayon::ThreadPoolBuilder::new().num_threads(cores).build_global().unwrap();

    if let Err(e) = process::process(&pipeline, locations).await {
        pipeline
            .add_error(
                &format!("Intactness Processing Error"),
                &format!("Failed to process Intactness pipeline #{}.\n\n{:?}", &pipeline.id, e),
                &pipeline.data.email
            ).await
            .unwrap_or_else(|e| {
                println!("Failed to add error: {:?}", e);
                std::process::exit(1);
            });
    }
}
