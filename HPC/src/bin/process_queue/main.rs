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
struct SharedAPIData {
    pub id: String,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    pub submit: bool,
    pub pending: bool,
    #[serde(rename = "uploadCount")]
    pub upload_count: Option<u8>,
}

async fn patch_pending(api_key: &str, url: &str) -> Result<()> {
    let data = json!({"pending": true, "submit": false});

    Client::new()
        .patch(url)
        .json(&data)
        .header("x-api-key", api_key)
        .send().await
        .context("Failed to patch pipeline.")?;

    Ok(())
}

fn create_sbatch_cmd(
    output_file: &str,
    cores: u8,
    job_name: &str,
    memory: u32,
    time: u32,
    wrap: &str
) -> String {
    let Locations { admin_email, base, .. } = load_locations().unwrap_or_else(|e| {
        println!("Error loading locations.json: {:?}", e);
        exit(1);
    });

    let slurm_error_handling = format!("--mail-type=FAIL --mail-user={}", admin_email);

    let sbatch_command = format!(
        "sbatch {} -o {} -n {} --job-name='{}' --mem={} -t {} --wrap='{}'",
        slurm_error_handling,
        output_file,
        cores,
        job_name,
        memory,
        time,
        wrap
    );

    // append sbatch command to a file located at {}/sbatch_commands.txt
    let sbatch_commands_file = format!("{}/sbatch_commands.txt", &base);
    let contents = format!("{}\n\n", &sbatch_command);
    std::fs::write(&sbatch_commands_file, contents).unwrap_or_else(|e| {
        println!("Error writing sbatch command to file: {:?}", e);
        exit(1);
    });

    sbatch_command
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

    let is_dev_cmd = if is_dev { " --is_dev" } else { "" };

    let lock_file: lock_file::LockFile = lock_file::LockFile::new(
        format!("{}/lock_process", &locations.base)
    );
    if lock_file.exists().unwrap_or(true) {
        println!("\n\nProcess currently running.\nExiting.\n\n");

        if lock_file.is_stale().unwrap_or(true) {
            //todo: send a notification email to locations.admin_email
            return Ok(());
        }

        exit(1);
    } else {
        lock_file.create()?;
    }

    let ogvs: Vec<SharedAPIData> = get_api(&locations.api_url[PipelineType::Ogv]).await.unwrap_or(
        vec![]
    );

    for ogv in ogvs {
        let is_stale = if ogv.pending && pipeline_is_stale(&ogv.created_at).unwrap_or(true) {
            " --is_stale"
        } else {
            ""
        };

        let run_is_stale = !is_stale.is_empty();

        if ogv.submit || run_is_stale {
            let mut cmd = format!(
                "cargo run --release --bin ogv -- --id={}{}{}",
                &ogv.id,
                &is_dev_cmd,
                is_stale
            );

            // no need to sbatch for is_stale , no heavy processing
            if !is_dev && !run_is_stale {
                cmd = create_sbatch_cmd(
                    &format!("{}/{}.out", &locations.log_dir[PipelineType::Ogv], &ogv.id),
                    5,
                    &format!("ogv-{}", &ogv.id),
                    20000,
                    1440,
                    &cmd
                );
            }

            run_command(&cmd, &locations.base)?;

            patch_pending(
                &locations.api_key,
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
            let paired_jobs = intact.upload_count.unwrap_or(0) / 2;

            let mut cores = paired_jobs;
            if cores < 1 {
                cores = 1;
            }
            cores = std::cmp::min(cores, 9);

            let memory: u32 = 20000 * (cores as u32);

            let mut cmd = format!(
                "cargo run --release --bin intactness -- --id={} --cores={}{}{}",
                &intact.id,
                cores,
                &is_dev_cmd,
                is_stale
            );

            // no need to sbatch for is_stale , no heavy processing
            if !is_dev && !run_is_stale {
                cmd = create_sbatch_cmd(
                    &format!("{}/{}.out", &locations.log_dir[PipelineType::Intact], &intact.id),
                    cores + 1,
                    &format!("intactness-{}", &intact.id),
                    memory,
                    1440,
                    &cmd
                );
            }

            run_command(&cmd, &locations.base)?;

            patch_pending(
                &locations.api_key,
                format!("{}/{}", &locations.api_url[PipelineType::Intact], &intact.id).as_str()
            ).await?;
        }
    }

    let tcss: Vec<SharedAPIData> = get_api(&locations.api_url[PipelineType::Tcs]).await.unwrap_or(
        vec![]
    );

    for tcs in tcss {
        let is_stale = if tcs.pending && pipeline_is_stale(&tcs.created_at).unwrap_or(true) {
            " --is_stale"
        } else {
            ""
        };

        let run_is_stale = !is_stale.is_empty();

        if tcs.submit || run_is_stale {
            let mut cores = tcs.upload_count.unwrap_or(0) / 2;
            if cores < 1 {
                cores = 1;
            }
            cores = std::cmp::min(cores, 9);

            let memory: u32 = 25000 * (cores as u32);

            let mut cmd = format!(
                "cargo run --bin tcsdr -- --id={} --cores={}{}{}",
                &tcs.id,
                cores,
                &is_dev_cmd,
                is_stale
            );

            // no need to sbatch for is_stale , no heavy processing
            if !is_dev && !run_is_stale {
                cmd = create_sbatch_cmd(
                    &format!("{}/{}.out", &locations.log_dir[PipelineType::Tcs], &tcs.id),
                    cores + 1,
                    &format!("tcs-{}", &tcs.id),
                    memory,
                    1440,
                    &cmd
                );
            }

            run_command(&cmd, &locations.base)?;

            patch_pending(
                &locations.api_key,
                format!("{}/{}", &locations.api_url[PipelineType::Tcs], &tcs.id).as_str()
            ).await?;
        }
    }

    let coreceptors: Vec<SharedAPIData> = get_api(
        &locations.api_url[PipelineType::Coreceptor]
    ).await.unwrap_or(vec![]);

    for coreceptor in coreceptors {
        let is_stale = if
            coreceptor.pending &&
            pipeline_is_stale(&coreceptor.created_at).unwrap_or(true)
        {
            " --is_stale"
        } else {
            ""
        };

        let run_is_stale = !is_stale.is_empty();

        if coreceptor.submit || run_is_stale {
            let mut cmd = format!(
                "cargo run --release --bin coreceptor -- --id={} {}{}",
                &coreceptor.id,
                &is_dev_cmd,
                is_stale
            );

            // no need to sbatch for is_stale , no heavy processing
            if !is_dev && !run_is_stale {
                cmd = create_sbatch_cmd(
                    &format!(
                        "{}/{}.out",
                        &locations.log_dir[PipelineType::Coreceptor],
                        &coreceptor.id
                    ),
                    1,
                    &format!("coreceptor-{}", &coreceptor.id),
                    5000,
                    1440,
                    &cmd
                );
            }

            run_command(&cmd, &locations.base)?;

            patch_pending(
                &locations.api_key,
                format!(
                    "{}/{}",
                    &locations.api_url[PipelineType::Coreceptor],
                    &coreceptor.id
                ).as_str()
            ).await?;
        }
    }

    lock_file.delete()?;

    Ok(())
}
