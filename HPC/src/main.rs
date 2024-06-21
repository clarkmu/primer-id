#![allow(unused_imports, dead_code, unused_variables, unreachable_code)]

// RUST_BACKTRACE=1 cargo watch -c -w src -x 'run -- --is_dev' --poll

use std::{ env, process::exit };
use load_locations::PipelineType;
use pipeline::{ OgvAPI, Pipeline };
use anyhow::Result;

mod pipeline;
mod process_ogv;
mod load_locations;
mod lock_file;

#[tokio::main]
async fn main() -> Result<()> {
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
    if lock_file.exists()? {
        if lock_file.is_stale()? {
            //todo: send a notification email to locations.admin_email
            return Ok(());
        }

        println!("\n\nProcess currently running.\nExiting.\n\n");
        exit(1);
    } else {
        lock_file.create()?;
    }

    let ogvs: Vec<OgvAPI> = match pipeline::get_api(&locations.api_url[PipelineType::Ogv]).await {
        Ok(data) => data,
        Err(e) => {
            println!("{}", e);
            let empty_vec: Vec<OgvAPI> = serde_json::from_value(serde_json::Value::Array(vec![]))?;
            empty_vec
        }
    };

    for ogv in ogvs {
        let pipeline: Pipeline = Pipeline::new(ogv, &locations, PipelineType::Ogv);
        match process_ogv::init(&pipeline).await {
            Ok(_) => {}
            Err(e) => {
                let subject = format!("OGV Error: {}", &pipeline.data.id);
                let msg = &e.to_string();
                pipeline.add_error(&subject, msg).await?;
                println!("{}: {}", subject, msg);
            }
        }
    }

    println!("All processed.");

    //process_intactness.await
    //process_tcsdr.await

    lock_file.delete()?;

    Ok(())
}
