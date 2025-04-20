use utils::{
    load_env_vars::{ EnvVars, load_env_vars },
    load_locations::{ Locations, PipelineType, load_locations },
    pipeline::{ SplicingAPI, Pipeline },
};

mod process;
mod sort_files;

#[tokio::main]
async fn main() -> () {
    let EnvVars { id, is_stale, cores, .. } = load_env_vars();

    let locations: Locations = load_locations().unwrap_or_else(|e| {
        println!("Error loading environment: {:?}", e);
        std::process::exit(1);
    });

    let pipeline: Pipeline<SplicingAPI> = match
        Pipeline::new(id.clone(), PipelineType::Splicing).await
    {
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
                &format!("TCS/DR Stale Job: {}", &id),
                "Pipeline has been pending for over 24 hours and has been cancelled.",
                &pipeline.data.email
            ).await
            .unwrap_or_else(|e| {
                println!("Failed to add error: {:?}", e);
                std::process::exit(1);
            });
        return ();
    }

    if cores == 1 {
        // handle error
    }

    // set thread count for thread pool in processing
    rayon::ThreadPoolBuilder::new().num_threads(cores).build_global().unwrap();

    if let Err(e) = process::process(&pipeline, locations).await {
        pipeline
            .add_error(
                &format!("TCS/DR Error {}", &pipeline.data.id),
                &format!("Failed to process TCS/DR pipeline #{}.\n\n{:?}", &pipeline.id, e),
                &pipeline.data.email
            ).await
            .unwrap_or_else(|e| {
                println!("Failed to add error: {:?}", e);
                std::process::exit(1);
            });
    }
}
