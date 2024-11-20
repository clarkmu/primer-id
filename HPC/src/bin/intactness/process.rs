use anyhow::{ Result, Context };
use utils::{
    compress::compress_dir,
    email_templates::{ receipt_email_template, results_email_template },
    load_locations::Locations,
    pipeline::{ IntactAPI, Pipeline },
    run_command::run_command,
    send_email::send_email,
};
use std::{ ffi::OsStr, fs::{ File, OpenOptions }, io::{ BufRead, BufReader, BufWriter, Write } };
use rayon::prelude::*;
use crate::split_sequences::split_sequences;
use serde_json::json;

const RESULTS_HEADER: &str =
    "Contig ID,Sample ID,Multi-Contig Sample?,Multi-HIV Sample?,Contig Length,Aligned Length,Aligned coverage of Contig,Ref Seq ID,Aligned Start at Ref,Ref Strand,Is HIV?,Primer,Primer Seq,Large Deletion?,Internal Inversion?,Hypermut?,Hypermut pval,PSC?,gag,pol,env,5' Defect,5' Gaps,5' Inserts,Gag Start Codon Missing?,Gag Start Seq,Final Call,Comments,Contig Sequence";

pub async fn process(pipeline: &Pipeline<IntactAPI>, locations: Locations) -> Result<()> {
    pipeline.add_log(&format!("Initializing Intactness pipeline #{}", &pipeline.id))?;

    // patch as pending
    // pipeline
    //     .patch_pipeline(serde_json::json!({"pending": true, "submit": false})).await
    //     .context("Failed to patch pipeline as pending.")?;

    // create variables
    // let input_sequence_file = format!("{}/seqs.fasta", &pipeline.scratch_dir);
    let results_location = format!("{}", &pipeline.scratch_dir);
    let sequences_html = format!(
        "<u>Sequences</u></br>{}",
        &pipeline.data.sequences
            .split("\n")
            .filter(|line| line.starts_with(">"))
            .map(|l| l.replace(">", ""))
            .collect::<Vec<String>>()
            .join("</br>")
    );
    let receipt = receipt_email_template(&sequences_html);
    let job_id: String = if pipeline.data.job_id.is_empty() {
        format!("intactness-results_{}", &pipeline.data.id)
    } else {
        pipeline.data.job_id.clone()
    };

    let seq_paths = split_sequences(&pipeline.data.sequences, &pipeline.scratch_dir)?;

    // email receipt
    send_email(
        &format!("Intactness Submission #{}", &job_id),
        &receipt,
        &pipeline.data.email,
        true
    ).await.context("Failed to send email receipt.")?;

    seq_paths
        .clone()
        .into_par_iter()
        .enumerate()
        .for_each(|(i, pathbuf)| {
            let date_now = chrono::Utc::now().to_rfc2822();
            let lib_name = pathbuf.file_name().unwrap_or(OsStr::new("")).to_str().unwrap_or("");

            if lib_name.is_empty() {
                return;
            }

            let _ = pipeline.add_log(
                &format!("Initializing job #{}: {} at [{}]", &i, lib_name, &date_now)
            );

            let run_pipeline_command = &format!(
                "conda run -n intactness --cwd {} python3 -m intactness -in {}/seqs.fasta -email {}",
                &locations.intactness_base_path,
                pathbuf.display(),
                &pipeline.data.email
            );

            // run cmd
            let _ = pipeline.add_log(
                format!(
                    "Running Intactness command: {:?}\nExec Location: {}",
                    &run_pipeline_command,
                    &pipeline.scratch_dir
                ).as_str()
            );
            let _ = run_command(run_pipeline_command, &pipeline.scratch_dir).context(
                "Failed in python module intactness."
            );
        });

    let summary_file_location = format!("{}/summary.csv", &pipeline.scratch_dir);
    let mut summary_errors: Vec<String> = vec![];
    let mut summary_results: Vec<String> = vec![];

    for pathbuf in seq_paths {
        let summary_location = pathbuf.join("intactness").join("summary.csv");

        let lib_name = pathbuf.file_name().unwrap_or(OsStr::new("")).to_str().unwrap_or("");

        if lib_name.is_empty() {
            summary_errors.push(format!("Failed to get lib name for path: {}", pathbuf.display()));
            continue;
        }

        if pathbuf.join("no_seqs_found.txt").exists() {
            summary_errors.push(
                format!("All sequences were filtered out during Blast. No results will be generated for {}.", lib_name)
            );
        } else if pathbuf.join("no_gaps.txt").exists() {
            summary_errors.push(
                format!("No gapped position found given a position on the reference genome. No results will be generated for {}.", lib_name)
            );
        } else if !summary_location.exists() {
            summary_errors.push(
                format!("No summary file found for {}. No results were generated.", lib_name)
            );
        } else {
            let summary_file = BufReader::new(
                File::open(&summary_location).context(
                    format!("Lib created empty summary: {}", lib_name)
                )?
            );
            // get the second line of summary_file

            match summary_file.lines().nth(1) {
                Some(Ok(line)) => {
                    summary_results.push(line);
                }
                Some(Err(e)) => {
                    summary_errors.push(
                        format!("Failed to read summary file for {}: {}", lib_name, e)
                    );
                }
                None => {
                    summary_errors.push(format!("No summary lines found for {}", lib_name));
                }
            }
        }
    }

    // write summary file
    let mut summary_file = BufWriter::new(
        OpenOptions::new()
            .write(true)
            .create(true)
            .open(&summary_file_location)
            .context("Failed to create/open summary file.")?
    );

    summary_file.write_all(
        format!(
            "{}\n{}\n{}",
            RESULTS_HEADER,
            summary_results.join("\n"),
            summary_errors.join("\n")
        ).as_bytes()
    )?;
    summary_file.flush()?;

    // compress results
    pipeline.add_log(
        &format!(
            "Compressing results\nInput: {}\nOutput: {}",
            &results_location,
            &pipeline.scratch_dir
        )
    )?;
    let (location, compressed_filename) = compress_dir(
        &pipeline.data.results_format,
        &job_id,
        &results_location,
        &pipeline.scratch_dir
    ).context("Failed to compress files.")?;

    // upload compressed results and get signed url to compressed results
    pipeline
        .bucket_upload(&location.display().to_string(), &compressed_filename)
        .context("Failed to upload files to bucket.")?;
    let signed_url = pipeline
        .bucket_signed_url(&compressed_filename)
        .context("Failed to generate a signed url.")?;

    // generate and send receipt
    pipeline.add_log("Emailing results.")?;
    let body = results_email_template(signed_url, "");
    send_email(
        &format!("Intactness Results #{}", &job_id),
        &body,
        &pipeline.data.email,
        false
    ).await?;

    // patch as completed
    pipeline
        .patch_pipeline(
            json!({
                    "pending": false,
                    "submit": false,
                })
        ).await
        .context("Failed to patch pipeline as completed.")?;

    Ok(())
}
