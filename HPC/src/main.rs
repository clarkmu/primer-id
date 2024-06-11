#![allow(unused_imports, dead_code, unused_variables, unreachable_code)]

// RUST_BACKTRACE=1 cargo watch -c -w src -x 'run -- --is_dev' --poll

use std::{ env, process::exit };
use load_locations::PipelineType;
use pipeline::{ OgvAPI, Pipeline };

mod pipeline;
mod process_ogv;
mod load_locations;
mod lock_file;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<String> = env::args().collect();
    let is_dev = args.iter().any(|e| e.contains("is_dev"));

    if is_dev {
        env::var("PORT").unwrap_or_else(|_| {
            println!("Dev not running in the docker shell. Exiting.");
            exit(1);
        });
    }

    let locations_file = if is_dev { "./locations.dev.json" } else { "./locations.json" };
    let locations = load_locations::read(locations_file, is_dev).unwrap_or_else(|e| {
        eprintln!("Error loading locations: {:?}", e);
        exit(1);
    });

    let lock_file: lock_file::LockFile = lock_file::LockFile::new(
        format!("{}/lock_process", &locations.base)
    );
    if lock_file.exists().unwrap() {
        if lock_file.is_stale().unwrap() {
            //todo: send a notification email to locations.admin_email
            return Ok(());
        }

        println!("\n\nProcess currently running.\nExiting.\n\n");
        exit(1);
    } else {
        let _ = lock_file.create();
    }

    let ogvs: Vec<OgvAPI> = pipeline::get_api(&locations.api_url[PipelineType::Ogv]).await.unwrap();
    for ogv in ogvs {
        let pipeline: Pipeline = Pipeline::new(ogv, &locations, PipelineType::Ogv);
        let _ = process_ogv::init(&pipeline).await?;
    }

    //process_intactness.await
    //process_tcsdr.await

    lock_file.delete()?;

    Ok(())
}
