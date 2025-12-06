// --poll for Linux
// 2>/dev/null  silence MADV_DONTNEED in Docker container
// RUST_BACKTRACE=1 cargo watch -c -w src -x 'run --bin main -- --is_dev' --poll 2>/dev/null

use anyhow::Result;
use serde::Deserialize;
use std::process::exit;
use utils::{
    get_api::get_api,
    load_env_vars::{ load_env_vars, EnvVars },
    load_locations::{ load_locations, Locations, PipelineType },
    lock_file,
    pipeline::{
        pipeline_is_stale,
        CoreceptorAPI,
        IntactAPI,
        OgvAPI,
        Pipeline,
        SplicingAPI,
        TcsAPI,
    },
    run_command::run_command,
};

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
        // exit(1);
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
        let (is_stale, is_stale_cmd) = pipeline_is_stale(&ogv.pending, &ogv.created_at, 48);

        if ogv.submit || is_stale {
            let pipeline: Pipeline<OgvAPI> = match
                Pipeline::new(ogv.id.clone(), PipelineType::Ogv).await
            {
                Ok(p) => p,
                Err(e) => {
                    println!("Error creating pipeline: {:?}", e);
                    continue; // skip this iteration if pipeline creation fails
                }
            };

            let (cores, memory) = pipeline.cores_and_memory();

            let mut cmd = format!(
                "cargo run --release --bin ogv -- --id={}{}{}",
                &ogv.id,
                &is_dev_cmd,
                is_stale_cmd
            );

            // no need to sbatch for is_stale , no heavy processing
            if !is_dev && !is_stale {
                cmd = create_sbatch_cmd(
                    &format!("{}/{}.out", &locations.log_dir[PipelineType::Ogv], &ogv.id),
                    cores + 1,
                    &format!("ogv-{}", &ogv.id),
                    memory,
                    2160,
                    &cmd
                );
            }

            run_command(&cmd, &locations.base)?;

            let _ = pipeline.send_receipt().await;
            let _ = pipeline.patch_pending().await?;
        }
    }

    let intacts: Vec<SharedAPIData> = get_api(
        &locations.api_url[PipelineType::Intact]
    ).await.unwrap_or(vec![]);

    for intact in intacts {
        let (is_stale, is_stale_cmd) = pipeline_is_stale(&intact.pending, &intact.created_at, 24);

        if intact.submit || is_stale {
            let pipeline: Pipeline<IntactAPI> = match
                Pipeline::new(intact.id.clone(), PipelineType::Intact).await
            {
                Ok(p) => p,
                Err(e) => {
                    println!("Error creating pipeline: {:?}", e);
                    continue; // skip this iteration if pipeline creation fails
                }
            };

            let (cores, memory) = pipeline.cores_and_memory(intact.upload_count);

            let mut cmd = format!(
                "cargo run --release --bin intactness -- --id={} --cores={}{}{}",
                &intact.id,
                cores + 1,
                &is_dev_cmd,
                is_stale_cmd
            );

            // no need to sbatch for is_stale , no heavy processing
            if !is_dev && !is_stale {
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

            let _ = pipeline.send_receipt().await;
            let _ = pipeline.patch_pending().await?;
        }
    }

    let tcss: Vec<SharedAPIData> = get_api(&locations.api_url[PipelineType::Tcs]).await.unwrap_or(
        vec![]
    );

    for tcs in tcss {
        let (is_stale, is_stale_cmd) = pipeline_is_stale(&tcs.pending, &tcs.created_at, 24);

        if tcs.submit || is_stale {
            let pipeline: Pipeline<TcsAPI> = match
                Pipeline::new(tcs.id.clone(), PipelineType::Tcs).await
            {
                Ok(p) => p,
                Err(e) => {
                    println!("Error creating pipeline: {:?}", e);
                    continue; // skip this iteration if pipeline creation fails
                }
            };

            let (cores, memory) = pipeline.cores_and_memory(&tcs.upload_count);

            let mut cmd = format!(
                "cargo run --release --bin tcsdr -- --id={} --cores={}{}{}",
                &tcs.id,
                cores + 1,
                &is_dev_cmd,
                is_stale_cmd
            );

            // no need to sbatch for is_stale , no heavy processing
            if !is_dev && !is_stale {
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

            let _ = pipeline.send_receipt().await;

            let _ = pipeline.patch_pending().await?;
        }
    }

    let coreceptors: Vec<SharedAPIData> = get_api(
        &locations.api_url[PipelineType::Coreceptor]
    ).await.unwrap_or(vec![]);

    for coreceptor in coreceptors {
        let (is_stale, is_stale_cmd) = pipeline_is_stale(
            &coreceptor.pending,
            &coreceptor.created_at,
            24
        );

        if coreceptor.submit || is_stale {
            let pipeline: Pipeline<CoreceptorAPI> = match
                Pipeline::new(coreceptor.id.clone(), PipelineType::Coreceptor).await
            {
                Ok(p) => p,
                Err(e) => {
                    println!("Error creating pipeline: {:?}", e);
                    continue; // skip this iteration if pipeline creation fails
                }
            };

            let (cores, memory) = pipeline.cores_and_memory();

            let mut cmd = format!(
                "cargo run --release --bin coreceptor -- --id={} {}{}",
                &coreceptor.id,
                &is_dev_cmd,
                is_stale_cmd
            );

            // no need to sbatch for is_stale , no heavy processing
            if !is_dev && !is_stale {
                cmd = create_sbatch_cmd(
                    &format!(
                        "{}/{}.out",
                        &locations.log_dir[PipelineType::Coreceptor],
                        &coreceptor.id
                    ),
                    cores + 1,
                    &format!("coreceptor-{}", &coreceptor.id),
                    memory,
                    1440,
                    &cmd
                );
            }

            run_command(&cmd, &locations.base)?;

            pipeline.send_receipt().await?;
            pipeline.patch_pending().await?;
        }
    }

    let splicings: Vec<SharedAPIData> = get_api(
        &locations.api_url[PipelineType::Splicing]
    ).await.unwrap_or(vec![]);

    for splicing in splicings {
        let (is_stale, is_stale_cmd) = pipeline_is_stale(
            &splicing.pending,
            &splicing.created_at,
            24
        );

        if splicing.submit || is_stale {
            let pipeline: Pipeline<SplicingAPI> = match
                Pipeline::new(splicing.id.clone(), PipelineType::Splicing).await
            {
                Ok(p) => p,
                Err(e) => {
                    println!("Error creating pipeline: {:?}", e);
                    continue; // skip this iteration if pipeline creation fails
                }
            };

            let (cores, memory) = pipeline.cores_and_memory();

            let mut cmd = format!(
                "cargo run --release --bin splicing -- --id={} {}{}",
                &splicing.id,
                &is_dev_cmd,
                is_stale_cmd
            );

            // no need to sbatch for is_stale , no heavy processing
            if !is_dev && !is_stale {
                cmd = create_sbatch_cmd(
                    &format!("{}/{}.out", &locations.log_dir[PipelineType::Splicing], &splicing.id),
                    cores + 1,
                    &format!("splicing-{}", &splicing.id),
                    memory,
                    1440,
                    &cmd
                );
            }

            run_command(&cmd, &locations.base)?;

            pipeline.send_receipt().await?;
            pipeline.patch_pending().await?;
        }
    }

    lock_file.delete()?;

    Ok(())
}
