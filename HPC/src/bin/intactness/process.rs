use anyhow::{ Result, Context };
use rayon::prelude::*;
use rayon::iter::IntoParallelIterator;
use utils::{
    compress::compress_dir,
    email_templates::{ receipt_email_template, results_email_template },
    load_locations::Locations,
    pipeline::{ IntactAPI, Pipeline },
    run_command::run_command,
    send_email::send_email,
};
use std::{ fs::{ File, OpenOptions }, io::{ BufRead, BufReader, BufWriter, Write }, path::PathBuf };
use bio::io::fasta;

const RESULTS_HEADER: &str =
    "Contig ID,Sample ID,Multi-Contig Sample?,Multi-HIV Sample?,Contig Length,Aligned Length,Aligned coverage of Contig,Ref Seq ID,Aligned Start at Ref,Ref Strand,Is HIV?,Primer,Primer Seq,Large Deletion?,Internal Inversion?,Hypermut?,Hypermut pval,PSC?,gag,pol,env,5' Defect,5' Gaps,5' Inserts,Gag Start Codon Missing?,Gag Start Seq,Final Call,Comments,Contig Sequence";

pub async fn process(pipeline: &Pipeline<IntactAPI>, locations: Locations) -> Result<()> {
    pipeline.add_log(&format!("Initializing Intactness pipeline #{}", &pipeline.id))?;

    // patch as pending
    pipeline
        .patch_pipeline(serde_json::json!({"pending": true, "submit": false})).await
        .context("Failed to patch pipeline as pending.")?;

    // create variables
    // let input_sequence_file = format!("{}/seqs.fasta", &pipeline.scratch_dir);
    let results_location = format!("{}/intactness", &pipeline.scratch_dir);
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
            let lib_name = pathbuf.file_name().unwrap().to_str().unwrap();

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

        let lib_name = pathbuf.file_name().unwrap().to_str().unwrap();

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
            let summary_file = BufReader::new(File::open(&summary_location).unwrap());
            // get the second line of summary_file
            let results = summary_file.lines().nth(1).unwrap().unwrap();
            summary_results.push(results);
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
    pipeline.add_log(
        &format!(
            "Uploading compressed results to bucket.\nFrom: {}\nTo: {}",
            &location.display(),
            &compressed_filename
        )
    )?;
    pipeline
        .bucket_upload(&location.display().to_string(), &compressed_filename)
        .context("Failed to upload files to bucket.")?;
    let signed_url = pipeline
        .bucket_signed_url(&compressed_filename)
        .context("Failed to generate a signed url.")?;

    // generate and send receipt
    pipeline.add_log("Emailing results.")?;
    let body = results_email_template(signed_url);
    send_email(
        &format!("Intactness Results #{}", &job_id),
        &body,
        &pipeline.data.email,
        false
    ).await?;

    // patch as completed
    pipeline
        .patch_pipeline(
            serde_json::json!({
                    "pending": false,
                    "submit": false,
                })
        ).await
        .context("Failed to patch pipeline as completed.")?;

    Ok(())
}

fn split_sequences(sequences: &str, path: &str) -> Result<Vec<PathBuf>> {
    let records = fasta::Reader::new(sequences.as_bytes()).records();

    let mut paths: Vec<PathBuf> = vec![];

    for record in records {
        let record = record.context("Failed to read record.")?;

        let id = record.id();
        let seq = std::str
            ::from_utf8(record.seq())
            .context("Failed to convert sequence to string.")?;

        let new_path = format!("{}/{}", path, id);
        let new_file = format!("{}/seqs.fasta", &new_path);

        paths.push(PathBuf::from(&new_path));

        std::fs::create_dir_all(&new_path)?;

        let mut writer = OpenOptions::new()
            .write(true)
            .create(true)
            .open(new_file)
            .context("Failed to create/open input sequence file.")?;

        writer.write_all(format!(">{}\n{}", id, seq).as_bytes())?;
    }

    return Ok(paths);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_split_sequences() {
        let sequences =
            ">test\nTGGAAGGGCTAATTCACTCCCAAAGAAGACAAGATATCCTTGATCTGTGGATCTACCACACACAAGGCTACTTCCCTGATTGGCAGAACTACACACCAGGGCCAGGGGTCAGATATCCACTGACCTTTGGATGGTGCTACAAGCTAGTACCAGTTGAGCCAGATAAGGTAGAAGAGGCCAATAAAGGAGAGAACACCAGCTTGTTACACCCTGTGAGCCTGCATGGAATGGATGACCCTGAGAGAGAAGTGTTAGAGTGGAGGTTTGACAGCCGCCTAGCATTCCATCACGTGGCCCGAGAGCTGCATCCGGAGTACTTCAAGAACTGCTGACATCGAGCTTTCTACAAGGGACTTTCCGCTGGGGACTTTCCAGGGAGGTGTGGCCTGGGCGGGACTGGGGAGTGGCGAGCCCTCAGATGCTACATATAAGCAGCTGCTTATTGCCTGTACTGGGTCTCTCTGGTTAGACCAGATCTGAGCCTGGGAGCTCTCTGGCTAACTAGGGAACCCACTGCTTAAGCCTCAATAAAGCTTGCCTTGAGTGCTCAAAGTAGTGTGTGCCCGTCTGTTGTGTGACTCTGGGAACTAGAGATCCCTCAGACCCTTTTAGTCAGTGTGGAAAATCTCTAGCAGTGGCGCCCGAACAGGGACTTGAAAGCGAAAGTAAAGCCAGAGGAGATCTCTCGACGCAGGACTCGGCTTGCTGAAGCGCGCACGGCAAGAGGCGAGGGGCGGCGACTGGTGAGTACGCCAAAAATTTTGACTAGCGGAGGCTAGAAGGAGAGAGATGGGTGCGAGAGTGTCGGTATTAAGCGGGGGAGAATTAGATAAATGGGAAAAAATTCGGTTAAGGCCAGGGGGAAAGAAACAATATAAACTAAAACATATAGTATGGGCAAGCAGGGAGCTAGAACGATTCGCAGTTAATCCTGGCCTTTTAGAGACATCAGAAGGCTGTAGACAAATACTGGGACAGCTACAACCATCCCTTCAGACAGGATCAGAAGAACTTAGATCATTATATAATACAATAGCAGTCCTCTATTGTGTGCATCAAAGGATAGATGTAAAAGACACCAAGGAAGCCTTAGATAAGATAGAGGAGGAGCAAAACAAAAGTAAGAAAAAGGCACAGCAAGCAGCAGCTGACACAGGAAACAACAGCCAGGTCAGCCAAAATTACCCTATAGTGCAGAACCTCCAGGGGCAAATGGTACATCAGGCCATATCACCTAGAACTTTAAATGCATGGGTAAAAGTAGTAGAAGAGAAGGCTTTCAGCCCAGAAGTAATACCCATGTTTTCAGCATTATCAGAAGGAGCCACCCCACAAGATTTAAATACCATGCTAAACACAGTGGGGGGACATCAAGCAGCCATGCAAATGTTAAAAGAGACCATCAATGAGGAAGCTGCAGAATGGGATAGATTGCATCCAGTGCATGCAGGGCCTATTGCACCAGGCCAGATGAGAGAACCAAGGGGAAGCGACATAGCAGGAACTACTAGTACCCTTCAGGAACAAATAGGATGGATGACACATAATCCACCTATCCCAGTAGGAGAAATCTATAAAAGATGGATAATCCTGGGATTAAATAAAATAGTAAGAATGTATAGCCCTACCAGCATTCTGGACATAAGACAAGGACCAAAGGAACCCTTTAGAGACTATGTAGACCGATTCTATAAAACTCTAAGAGCCGAGCAAGCTTCACAAGAGGTAAAAAATTGGATGACAGAAACCTTGTTGGTCCAAAATGCGAACCCAGATTGTAAGACTATTTTAAAAGCATTGGGACCAGGAGCGACACTAGAAGAAATGATGACAGCATGTCAGGGAGTGGGGGGACCCGGCCATAAAGCAAGAGTTTTGGCTGAAGCAATGAGCCAAGTAACAAATCCAGCTACCATAATGATGCAGAGAGGCAATTTTAGGAACCAAAGAAAGACTGTTAAGTGTTTCAATTGTGGCAAAGAAGGGCACATAGCCAAAAATTGCAGGGCCCCTAGGAAAAAGGGCTGTTGGAAATGTGGAAAGGAAGGACACCAAATGAAAGATTGTACTGAGCGACAGGCTAATTTTTTAGGGAAGATCTGGCCTTCCCACAAGGGAAGGCCAGGGAATTTTCTTCAGAGCAGACCAGAGCCAACAGCCCCACCAGAAGAGAGCTTCAGGTTTGGGGAAGAGACAACAACTCCCTCTCAGAAGCAGGAGCCGATAGACAAGGAACTGTATCCTTTAGCTTCCCTCAGATCATTCTTTGGCAGCGACCCCTCGTCACAATAAAGATAGGGGGGCAATTAAAGGAAGCTCTATTAGATACAGGAGCAGATGATACAGTATTAGAAGAAATGAATTTGCCAGGAAGAAGGAAACCAAAAATGATAGGGGGAATTGGAGGTTTTATCAAAGTAAGACAGTATGATCAGATACTCATAGAAATCTGCGGACATAAAGCTATAGGTACAGTATTAGTAGGACCTACACCTGTCAACATAATTGGAAGAAATCTGTTGACTCAGATTGGCTGCACTTTAAATTTTCCCATTAGTCCTATTGAGACTGTACCAGTAAAATTAAAGCCAGGAATGGACGGTCCGAAAGTTAAACAATGGCCATTGACAGAAGAAAAAATAAAAGCATTAGTAGAAATTAGTACAGAAATGGAAAAGGAAGGAAAAATTTCAAAAATTGGGCCTGAAAATCCATACAATACTCCAGTATTTGCCATAAAGAAAAAAGACAGTACTAAATGGAGAAAATTAGTAGATTTCAGAGAACTTAATAAGAGAACTCAAGATTTCTGGGAAGTTCAATTAGGAATACCACATCCTGCAGGGTTAAAACAGAAAAAATCAGTAACAGTACTGGATGTGGGCGATGCATATTTTTCAGTTCCCTTAGATAAAGACTTCAGGAAGTATACTGCATTTACCATACCTAGTATAACAATGAGACACCAGGGATTAGATATCAGTACAATGTGCTTCCACAGGGATGGAAAGGATCACCAGCAATATTCCAGTGTAGCATGACAAAAATCTTAGAGCCTTTTAGAAAACAAAATCCAGACATAGCCATCTATCAATACATGGATGATTTGTATGTAGGATCTGACTTAGAAATAGGGCAGCATAGAACAAAAATAGAGGAACTGAGACAACATCTGTTGAGGTGGGGATTTACCACACCAGACAAAAAACATCAGAAAGAACCTCCATTCCTTTGGATGGGTTATGAACTCCATCCTGATAAATGGACAGTACAGCCTATAGTGCTGCCAGAAAAGGACAGCTGGACTGTCAATGACATACAGAAATTAGTGGGAAAATTGAATTGGGCAAGTCAGATTTATGCAGGGATTAAAGTAAGGCAATTATGTAAACTTCTTAGGGGAACCAAAGCACTAACAGAAGTAGTACCACTAACAGAAGAAGCAGAGCTAGAACTGGCAGAAAACAGGGAGATTCTAAAAGAACCGGTACATGGGGTGTATTATGACCCTTCGAAAGACTTAATAGCAGAAATACAGAAGCAGGGGCAAGGCCAATGGACATATCAAATTTATCAAGAGCCATTTAAAAATCTGAAAACAGGAAAGTATGCAAGAATGAAGGGTGCCCACACTAATGATGTGAAACAATTAACAGAGGCAGTACAAAAAATAGCCACAGAAAGCATAGTAATATGGGGAAAGACTCCTAAATTTAAATTACCCATACAAAGGGAAACATGGGAAGCATGGTGGACAGAGTGTTGGCAAGCCACCTGGATTCCTGAGTGGGAGTTTGTCAATACCCCTCCCTTAGTGAAGTTATGGTACCAGTTAGAGAAAGAACCCATAATAGGAGCAGAAACTTTCTATGTAGATGGGGCAGCCATTAGGGAAACTAAATTAGGAAAAGCAGGATATGTAACTGACAGGGGAAGACAAAAAGTTGTCCCCCTAACGGACACAACAAATCAGAAGACTGAGTTACAAGCAATTCATCTAGCTTTGCAGGATTCGGGATTAGAAGTAAACATAGTGACAGACTCACAATATGCATTGGGAATCATTCAAGCACAACCAGATAAGAGTGAATCAGAGTTAGTCAGTCAAATAATAGAGCAGTTAATAAAAAAGGAAAAAGTCTACCTGGCATGGGTACCAGCACACAAAGGAATTGGAGGAAATGAACAAGTAGATAAATTGGTCAGTGCTGGAATCAGGAAAGTACTATTTTTAGATGGAATAGATAAGGCCCAAGAAGAACATGAGAAATATCACAGTAATTGGAGAGCAATGGCTAGTGATTTTAACCTACCACCTGTAGTAGCAAAAGAAATAGTAGCCAGCTGTGATAAATGTCAGCTAAAAGGGGAAGCCATGCATGGACAAGTAGACTGTAGCCCAGGAATATGGCAGCTAGATTGTACACATTTAGAAGGAAAAGTTATCTTGGTAGCAGTTCATGTAGCCAGTGGATATATAGAAGCAGAAGTAATTCCAGCAGAGACAGGGCAAGAAACAGCATACTTCCTCTTAAAATTAGCAGGAAGATGGCCAGTAAAAACAGTACATACAGACAATGGCAGCAATTTCACCAGTACTACAGTTAAGGCCGCCTGTTGGTGGGCGGGGATCAAGCAGGAATTTGGCATTCCCTACAATCCCCAAAGTCAAGGAGTAATAGAATCTATGAATAAAGAATTAAAGAAAATTATAGGACAGGTAAGAGATCAGGCTGAACATCTTAAGACAGCAGTACAAATGGCAGTATTCATCCACAATTTTAAAAGAAAAGGGGGGATTGGGGGGTACAGTGCAGGGGAAAGAATAGTAGACATAATAGCAACAGACATACAAACTAAAGAATTACAAAAACAAATTACAAAAATTCAAAATTTTCGGGTTTATTACAGGGACAGCAGAGATCCAGTTTGGAAAGGACCAGCAAAGCTCCTCTGGAAAGGTGAAGGGGCAGTAGTAATACAAGATAATAGTGACATAAAAGTAGTGCCAAGAAGAAAAGCAAAGATCATCAGGGATTATGGAAAACAGATGGCAGGTGATGATTGTGTGGCAAGTAGACAGGATGAGGATTAACACATGGAAAAGATTAGTAAAACACCATATGTATATTTCAAGGAAAGCTAAGGACTGGTTTTATAGACATCACTATGAAAGTACTAATCCAAAAATAAGTTCAGAAGTACACATCCCACTAGGGGATGCTAAATTAGTAATAACAACATATTGGGGTCTGCATACAGGAGAAAGAGACTGACATTTGGGTCAGGGAGTCTCCATAGAATGGAGGAAAAAGAGATATAGCACACAAGTAGACCCTGACCTAGCAGACCAACTAATTCATCTGCACTATTTTGATTGTTTTTCAGAATCTGCTATAAGAAATACCATATTAGGACGTATAGTTAGTCCTAGGTGTGAATATCAAGCAGGACATAACAAGGTAGGATCTCTACAGTACTTGGCACTAGCAGCATTAATAAAACCAAAACAGATAAAGCCACCTTTGCCTAGTGTTAGGAAACTGACAGAGGACAGATGGAACAAGCCCCAGAAGACCAAGGGCCACAGAGGGAGCCATACAATGAATGGACACTAGAGCTTTTAGAGGAACTTAAGAGTGAAGCTGTTAGACATTTTCCTAGGATATGGCTCCATAACTTAGGACAACATATCTATGAAACTTACGGGGATACTTGGGCAGGAGTGGAAGCCATAATAAGAATTCTGCAACAACTGCTGTTTATCCATTTCAGAATTGGGTGTCGACATAGCAGAATAGGCGTTACTCGACAGAGGAGAGCAAGAAATGGAGCCAGTAGATCCTAGACTAGAGCCCTGGAAGCATCCAGGAAGTCAGCCTAAAACTGCTTGTACCAATTGCTATTGTAAAAAGTGTTGCTTTCATTGCCAAGTTTGTTTCATGACAAAAGCCTTAGGCATCTCCTATGGCAGGAAGAAGCGGAGACAGCGACGAAGAGCTCATCAGAACAGTCAGACTCATCAAGCTTCTCTATCAAAGCAGTAAGTAGTACATGTAATGCAACCTATGATAGTAGCAATAGTAGCATTAGTAGTAGCAATAATAATAGCAATAGTTGTGTGGTCCATAGTAATCATAGAATATAGGAAAATATTAAGACAAAGAAAAATAGACAGGTTAATTGATAGACTAATAGAAAGAGCAGAAGACAGTGGCAATGAGAGTGAAGGAGAAGTATCAGCACTTGTGGAGATGGGGGTGGAAATGGGGCACCATGCTCCTTGGGATATTGATGATCTGTAGTGCTACAGAAAAATTGTGGGTCACAGTCTATTATGGGGTACCTGTGTGGAAGGAAGCAACCACCACTCTATTTTGTGCATCAGATGCTAAATCATATGATACAGAGGTACATAATGTTTGGGCCACACATGCCTGTGTACCCACAGACCCCAACCCACAAGAAGTAGTATTGGTAAATGTGACAGAAAATTTTAACATGTGGAAAAATGACATGGTAGAACAGATGCATGAGGACATAATCAGTTTATGGGATCAAAGCCTAAAGCCATGTGTAAAATTAACCCCACTCTGTGTTAGTTTAAAGTGCACTGATTTGAAGAATGATACTAATACCAATAGTAGTAGCGGGAGAATGATAATGGAGAAAGGAGAGATAAAAAACTGCTCTTTCAATATCAGCACAAGCATAAGAGATAAGGTGCAGAAAGAATATGCATTCTTTTATAAACTTGATATAGTACCAATAGATAATACCAGCTATAGGTTGATAAGTTGTAACACCTCAGTCATTACACAGGCCTGTCCAAAGGTATCCTTTGAGCCAATTCCCATACATTATTGTGCCCCGGCTGGTTTCGCGATTCTAAAATGTAATAATAAGACGTTCAATGGAACAGGACCATGTACAAATGTCAGCACAGTACAGTGTACACATGGAATCAGGCCAGTAGTATCAACTCAACTGCTGTTAAATGGCAGTCTAGCAGAAGAAGATGTAGTAATTAGATCTGCCAATTTCACAGACAATGCTAAAACCATAATAGTACGGCTGAACACATCTGTAGAAATTAATTGTACAAGACCCAACAACAATACAAGAAAAAGTATCCGTATCCAGAGGGGACCAGGGAGAGCATTTGTTACAATAGGAAAAATAGGAAATATGAGACAAGCACATTGTAACATTAGTAGAGCAAAATGGAATGCCACTTTAAAACAGATAGCTAGCAAATTAAGAGAACAATTTGGAAATAATAAAACAATAATCTTTAAGCAATCCTCAGGAGGGGGCCCAGAGATTGTAACGCACAGTTTTAATTGTGGAGGGGAATTTTTCTACTGTAATTCAACACTACTGTTTAATAGTACTTGGTTTAATAGTACTTGGAGTACTGAAGGGTCAAATAACACTGAAGGAAGTGACACAATCACACTCCCATGCAGAATAAAACAATTTATAAACATGTGGCAGGAAGTAGGAAAAGCAATGTATGCCCCTCCCATCAGTGGACAAATTAGATGTTCATCAAATATTACTGGGCTGCTATTAACAAGAGATGGTGGTAATAACAACAATGGGTCCGAGATCTTCAGACCTGGAGGAGGCGATATGAGGGACAATTGGAGAAGTGAGTTATATAAATATAAAGTAGTAAAAATTGAACCATTAGGAGTAGCACCCACCAAGGCAAAGAGAAGAGTGGTGCAGAGAGAAAAAAGAGCAGTGGGAGTAGGAGCTTTGTTCCTTGGGTTCTTGGGAGCAGCAGGAAGCACTATGGGCGCAGCGTCAATGACGCTGACGGTACAGGCCAGACAATTATTGTCTGATATAGTGCAGCAGCAGAACAATTTGCTGAGGGCTATTGAGGCGCAACAGCATCTGTTGCAACTCACAGTCTGGGGCATCAAACAGCTCCAGGCAAGAATCCTGGCTGTGGAAAGATACCTAAAGGATCAACAGCTCCTGGGGATTTGGGGTTGCTCTGGAAAACTCATTTGCACCACTGCTGTGCCTTGGAATGCTAGTTGGAGTAATAAATCTCTGGAACAGATTTGGAATAACATGACCTGGGTGGAGTGGGACAGAGAAATTAACAATTACACAAGCTTAATACACTCCTTAATTGAAGAATCGCAAAACCAGCAAGAAAAGAATGAACAAGAATTATTGGAATTAGATAAATGGGCAAGTTTGTGGAATTGGTTTAACATAACAAATTGGCTGTGGTATATAAAATTATTCATAATGATAGTAGGAGGCTTGGTAGGTTTAAGAATAGTTTTTGCTGTACTTTCTACAGTGAATAGAGTTAGGCAGGGATATTCACCATTATCGTTTCAGACCCACCTCCCAATCCCGAGGGGACCCGACAGGCCCGAAGGAATAGAAGAAGAAGGTGGAGAGAGAGACAGAGACAGATCCATTCGATTAGTGAACGGATCCTTAGCACTTATCTGGGACGATCTGCGGAGCCTGTGCCTCTTCAGCTACCACCGCTTGAGAGACTTACTCTTGATTGTAACGAGGATTGTGGAACTTCTGGGACGCAGGGGGTGGGAAGCCCTCAAATATTGGTGGAATCTCCTACAGTATTGGAGTCAGGAACTAGAGAATAGTGCTGTTAACTTGCTCAATGCTACAGCCATAGCAGTAGCTGAGGGGACAGATAGGGTTATAGAAGTATTACAAGCAGCTTATAGAGCTATTCGCCACATACCTAGAAGAATAAGACAGGGCTTGGAAAGGATTTTGCTATAAGATGGGTGGCAAGTGGTCAAAAAGTAGTGTGATTGGATGGCCTGCTGTAAGGGAAAGAATGAGACGAGCTGAGCCAGCAGCAGATGGGGTGGGAGCTGTATCTCGAGACCTAGAAAAACATGGAGCAATCACAAGTAGCAATACAGCAGCTAACAATGCTGCTTGTGCCTGGCTAGAAGCACAAGAGGAGGAAGAGGTGGGTTTTCCAGTCACACCTCAGGTACCTTTAAGACCAATGACTTACAAGGCAGCTGTAGATCTTAGCCACTTTTTAAAAGAAAAGGGGGGACTGGAAGGGCTAATTCACTCCCAAAGAAGACAAGGTATCCTTGATCTGTGGATCTACCACACACAAGGCTACTTCCCTGATTGGCAGAACTACACACCAGGGCCAGGGGTCAGATATCCACTGGCCTTTGGATGGTGCTACAAGCTAGTACCAGTTGAGCCAGATAAGGTAGAAGAGGCCAATAAAGGAGAGAACACCAGCTTGTTACACCCTGTGAGCCTGCATGGAATGGATGACCCTGAGAGAGAAGTGTTAGAGTGGAGGTTTGACAGCCGCCTAGCATTTCATCACGTGGCCCGAGAGCTGCATCCGGAGTACTTCAAGAACTGCTGACATCGAGCTTTCTACAAGGGACTTTCCGCTGGGGACTTTCCAGGGAGGTGTGGCCTGGGCGGGACTGGGGAGTGGCGAGCCCTCAGATGCTACATATAAGCAGCTGCTTTTTGCCTGTACTGGGTCTCTCTGGTTAGACCAGATCTGAGCCTGGGAGCTCTCTGGCTAACTAGGGAACCCACTGCTTAAGCCTCAATAAAGCTTGCCTTGAGTGCTCAAAGTAGTGTGTGCCCGTCTGTTGTGTGACTCTGGTAACTAGAGATCCCTCAGACCCTTTTAGTCAGTGTGGAAAATCTCTAGCA";
        let file = "./tests/intactness";
        let result = split_sequences(sequences, file).unwrap();
        assert_eq!(result.len(), 1);
    }
}
