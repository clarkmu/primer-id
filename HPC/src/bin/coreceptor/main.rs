use utils::{
    load_env_vars::{ load_env_vars, EnvVars },
    load_locations::{ load_locations, Locations, PipelineType },
    pipeline::{ CoreceptorAPI, Pipeline },
};

// cargo run --bin coreceptor -- --id=667af1f0fe90441ac2375c50 --is_dev --is_stale

mod process;

#[tokio::main]
async fn main() -> () {
    let EnvVars { id, is_stale, .. } = load_env_vars();

    let locations: Locations = load_locations().unwrap_or_else(|e| {
        println!("Error loading environment: {:?}", e);
        std::process::exit(1);
    });

    let pipeline: Pipeline<CoreceptorAPI> = match
        Pipeline::new(&id, PipelineType::Coreceptor).await
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
                &format!("Stale Coreceptor Job: {}", &id),
                "Pipeline has been pending for over 24 hours and has been cancelled.",
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
                &format!("Coreceptor Processing Error"),
                &format!("Failed to process Coreceptor pipeline #{}.\n\n{:?}", &pipeline.id, e),
                &pipeline.data.email
            ).await
            .unwrap_or_else(|e| {
                println!("Failed to add error: {:?}", e);
                std::process::exit(1);
            });
    }
}
