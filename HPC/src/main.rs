#![allow(unused_imports, dead_code, unused_variables)]

// RUST_BACKTRACE=1 cargo watch -c -w src -x 'run -- --is_dev' --poll

use std::{ env, process::exit };

mod pipeline;
mod process_ogv;
mod load_locations;
mod lock_file;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<String> = env::args().collect();
    let is_dev = args.iter().any(|e| e.contains("is_dev"));

    let locations_file = if is_dev { "./locations.dev.json" } else { "./locations.json" };
    let locations = load_locations::read(locations_file, is_dev)?;

    // let lock_file = lock_file::LockFile::new(format!("{}/lock_process", &locations.base));
    // if lock_file.exists()? {
    //     println!("\n\nProcess currently running.\nExiting.\n\n");
    //     std::process::exit(1);
    // } else {
    //     lock_file.create()?;
    // }

    process_ogv::init(&locations).await?;

    //process_intactness.await
    //process_tcsdr.await

    // lock_file.delete()?;

    Ok(())
}
