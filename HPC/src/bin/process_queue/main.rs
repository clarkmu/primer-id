#![allow(unused_imports, dead_code, unused_variables)]
// --poll for Linux
// 2>/dev/null  silence MADV_DONTNEED in Docker container
// RUST_BACKTRACE=1 cargo watch -c -w src -x 'run --bin main -- --is_dev' --poll 2>/dev/null

use std::process::exit;
use anyhow::{ Result, Context };
use serde::Deserialize;
use utils::{
    get_api::get_api,
    load_env_vars::{ load_env_vars, EnvVars },
    load_locations::{ Locations, PipelineType, load_locations },
    lock_file,
    pipeline::pipeline_is_stale,
    run_command::run_command,
};
use reqwest::Client;
use serde_json::json;

#[derive(Debug, Deserialize)]
pub struct SharedAPIData {
    pub id: String,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    pub submit: bool,
    pub pending: bool,
    #[serde(rename = "uploadCount")]
    pub upload_count: Option<u8>,
}

// todo: need to patch pipeline {submit: false, pending: true} directly after sbatch
// todo add --email fail admin_email to sbatches

async fn patch_pending(url: &str) -> Result<()> {
    let Locations { api_key, .. } = load_locations().unwrap_or_else(|e| {
        println!("Error loading environment: {:?}", e);
        exit(1);
    });

    let data = json!({"pending": true, "submit": false});

    Client::new()
        .patch(url)
        .json(&data)
        .header("x-api-key", api_key)
        .send().await
        .context("Failed to patch pipeline.")?;

    Ok(())
}

#[tokio::main]
async fn main() -> Result<()> {
    let EnvVars { is_dev, .. } = load_env_vars();

    let locations = load_locations().unwrap_or_else(|e| {
        println!("Error loading environment: {:?}", e);
        exit(1);
    });

    if is_dev {
        std::env::var("PORT").unwrap_or_else(|_| {
            println!("Dev not running in the docker shell. Exiting.");
            exit(1);
        });
    }

    let lock_file: lock_file::LockFile = lock_file::LockFile::new(
        format!("{}/lock_process", &locations.base)
    );
    if lock_file.exists().unwrap_or(true) {
        if lock_file.is_stale().unwrap_or(true) {
            //todo: send a notification email to locations.admin_email
            return Ok(());
        }

        println!("\n\nProcess currently running.\nExiting.\n\n");
        exit(1);
    } else {
        lock_file.create()?;
    }

    let ogvs: Vec<SharedAPIData> = get_api(&locations.api_url[PipelineType::Ogv]).await.unwrap_or(
        vec![]
    );

    dbg!(&ogvs);

    for ogv in ogvs {
        let is_stale = if ogv.pending && pipeline_is_stale(&ogv.created_at).unwrap_or(true) {
            " --is_stale"
        } else {
            ""
        };

        let run_is_stale = !is_stale.is_empty();

        if ogv.submit || run_is_stale {
            let is_dev_cmd = if is_dev { " --is_dev" } else { "" };
            let mut cmd = format!(
                "cargo run --release --bin ogv -- --id={}{}{}",
                &ogv.id,
                is_dev_cmd,
                is_stale
            );

            // no need to sbatch for is_stale , no heavy processing
            if !is_dev && !run_is_stale {
                cmd = format!(
                    "sbatch -o {} -n 5 --job-name='{}' --mem=20000 -t 1440 --wrap='{}'",
                    format!("{}/{}.out", &locations.log_dir[PipelineType::Ogv], &ogv.id),
                    format!("ogv-{}", &ogv.id),
                    &cmd
                );
            }

            println!("{}", cmd);

            let output = std::process::Command
                ::new("bash")
                .arg("-c")
                .arg(&cmd)
                .output()
                .expect("Failed to execute command");

            println!("{}", String::from_utf8_lossy(&output.stdout));

            patch_pending(
                format!("{}/{}", &locations.api_url[PipelineType::Ogv], &ogv.id).as_str()
            ).await?;
        }
    }

    let intacts: Vec<SharedAPIData> = get_api(
        &locations.api_url[PipelineType::Intact]
    ).await.unwrap();

    for intact in intacts {
        let is_stale = if intact.pending && pipeline_is_stale(&intact.created_at).unwrap_or(true) {
            " --is_stale"
        } else {
            ""
        };

        let run_is_stale = !is_stale.is_empty();

        if intact.submit || run_is_stale {
            let is_dev_cmd = if is_dev { " --is_dev" } else { "" };

            let mut cores = intact.upload_count.unwrap_or(0) / 2;
            if cores < 1 {
                cores = 1;
            }
            cores = std::cmp::min(cores, 9);

            let memory: u32 = 20000 * (cores as u32);

            let mut cmd = format!(
                "cargo run --release --bin intactness -- --id={} --cores={}{}{}",
                &intact.id,
                cores,
                is_dev_cmd,
                is_stale
            );

            // no need to sbatch for is_stale , no heavy processing
            if !is_dev && !run_is_stale {
                let time = cores * 10;

                cmd = format!(
                    "sbatch -o {} -n {} --job-name='{}' --mem={} -t {} --wrap=\"{}\"",
                    format!("{}/{}.out", &locations.log_dir[PipelineType::Intact], &intact.id),
                    cores + 1,
                    format!("intactness-{}", &intact.id),
                    memory,
                    time,
                    &cmd
                );
            }

            println!("{}", cmd);

            let output = std::process::Command
                ::new("bash")
                .arg("-c")
                .arg(&cmd)
                .output()
                .expect("Failed to execute command");

            println!("{}", String::from_utf8_lossy(&output.stdout));

            patch_pending(
                format!("{}/{}", &locations.api_url[PipelineType::Intact], &intact.id).as_str()
            ).await?;
        }
    }

    // let tcss: Vec<SharedAPIData> = get_api(&locations.api_url[PipelineType::Tcs]).await.unwrap_or(
    //     vec![]
    // );

    // for tcs in tcss {
    //     let is_stale = if tcs.pending && pipeline_is_stale(&tcs.created_at).unwrap_or(true) {
    //         "--is_stale"
    //     } else {
    //         ""
    //     };

    //     let run_is_stale = !is_stale.is_empty();

    //     if tcs.submit || run_is_stale {
    //         let is_dev_cmd = if is_dev { "--is_dev" } else { "" };

    //         let mut cores = tcs.upload_count.unwrap_or(0) / 2;
    //         cores = std::cmp::min(cores, 9);

    //         let memory: u32 = 20000 * (cores as u32);

    //         let mut cmd = format!(
    //             "cargo run --bin tcsdr -- --id={} --cores={} {} {}",
    //             &tcs.id,
    //             cores,
    //             is_dev_cmd,
    //             is_stale
    //         );

    //         // no need to sbatch for is_stale , no heavy processing
    //         if !is_dev && !run_is_stale {
    //             let output_file = format!(
    //                 "{}/{}.out",
    //                 &locations.log_dir[PipelineType::Tcs],
    //                 &tcs.id
    //             );
    //             let job_name = format!("tcs-{}", &tcs.id);

    //             cmd = format!(
    //                 "sbatch -o {} -n {} --job-name='{}' --mem={} -t 1440 --wrap='{}'",
    //                 output_file,
    //                 cores + 1,
    //                 job_name,
    //                 memory,
    //                 &cmd
    //             );
    //         }

    //         if !cmd.is_empty() {
    //             let _ = run_command(&cmd, &locations.base);
    //         }
    //     }
    // }

    println!("All processed.");

    lock_file.delete().expect("Failed to delete lock file !?");

    Ok(())
}
