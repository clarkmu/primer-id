use anyhow::{ Context, Result };
use bio::io::fastq;
use flate2::{ read::GzDecoder, write::GzEncoder, Compression };
use glob::glob;
use rand::{ rngs::StdRng, Rng, SeedableRng };
use std::{
    fs::File,
    io::{ BufReader, BufWriter, Read, Write },
    path::{ Path, PathBuf },
};

pub const MAX_SAMPLES_PER_FILE: usize = 1_000_000;
const DOWNSAMPLE_SEED: u64 = 0x5eed_1eaf_cafe_babe;

pub fn downsample_sequence_files<F>(
    samples_dir: &str,
    max_samples: usize,
    mut on_downsampled: F
) -> Result<()>
where
    F: FnMut(&Path, usize) -> Result<()>
{
    for file in sequence_files(samples_dir)? {
        let sample_count = count_fastq_records(&file)?;

        if sample_count <= max_samples {
            continue;
        }

        rewrite_random_fastq_subset(&file, sample_count, max_samples)?;
        on_downsampled(&file, sample_count)?;
    }

    Ok(())
}

fn sequence_files(samples_dir: &str) -> Result<Vec<PathBuf>> {
    let pattern = Path::new(samples_dir).join("**").join("*");
    let mut files = glob(pattern.to_str().context("Invalid samples directory path.")?)?
        .filter_map(Result::ok)
        .filter(|path| path.is_file() && is_fastq(path))
        .collect::<Vec<PathBuf>>();

    files.sort();
    Ok(files)
}

fn is_fastq(path: &Path) -> bool {
    let file_name = path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();

    file_name.ends_with(".fastq")
        || file_name.ends_with(".fq")
        || file_name.ends_with(".fastq.gz")
        || file_name.ends_with(".fq.gz")
}

fn count_fastq_records(path: &Path) -> Result<usize> {
    let reader = fastq::Reader::new(open_fastq_reader(path)?);
    let mut count = 0;

    for record in reader.records() {
        record.with_context(|| format!("Failed to read FASTQ file '{}'.", path.display()))?;
        count += 1;
    }

    Ok(count)
}

fn rewrite_random_fastq_subset(path: &Path, total: usize, keep: usize) -> Result<()> {
    let temp_path = path.with_file_name(format!(
        ".{}.downsampling",
        path.file_name()
            .and_then(|name| name.to_str())
            .context("FASTQ file name is not valid UTF-8.")?
    ));
    let reader = fastq::Reader::new(open_fastq_reader(path)?);
    let mut writer = fastq::Writer::new(open_fastq_writer(&temp_path, is_gzip(path))?);
    let mut rng = StdRng::seed_from_u64(DOWNSAMPLE_SEED ^ total as u64);
    let mut remaining = total;
    let mut remaining_to_keep = keep;

    for record in reader.records() {
        let record =
            record.with_context(|| format!("Failed to read FASTQ file '{}'.", path.display()))?;

        if rng.gen_range(0..remaining) < remaining_to_keep {
            writer
                .write_record(&record)
                .with_context(|| format!("Failed to downsample '{}'.", path.display()))?;
            remaining_to_keep -= 1;
        }

        remaining -= 1;
    }

    drop(writer);

    if remaining_to_keep != 0 {
        return Err(anyhow::anyhow!(
            "Failed to select {} samples from '{}'.",
            keep,
            path.display()
        ));
    }

    std::fs::rename(&temp_path, path).with_context(|| {
        format!(
            "Failed to replace '{}' with its downsampled file.",
            path.display()
        )
    })?;

    Ok(())
}

fn open_fastq_reader(path: &Path) -> Result<Box<dyn Read>> {
    let file =
        File::open(path).with_context(|| format!("Failed to open '{}'.", path.display()))?;

    if is_gzip(path) {
        Ok(Box::new(GzDecoder::new(BufReader::new(file))))
    } else {
        Ok(Box::new(BufReader::new(file)))
    }
}

fn open_fastq_writer(path: &Path, gzip: bool) -> Result<Box<dyn Write>> {
    let file =
        File::create(path).with_context(|| format!("Failed to create '{}'.", path.display()))?;
    let writer = BufWriter::new(file);

    if gzip {
        Ok(Box::new(GzEncoder::new(writer, Compression::default())))
    } else {
        Ok(Box::new(writer))
    }
}

fn is_gzip(path: &Path) -> bool {
    path.extension()
        .and_then(|extension| extension.to_str())
        .map_or(false, |extension| extension.eq_ignore_ascii_case("gz"))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn write_fastq(path: &Path, record_count: usize, mate: u8) {
        let mut writer =
            fastq::Writer::new(open_fastq_writer(path, is_gzip(path)).unwrap());

        for index in 0..record_count {
            let id = format!("sample_{index}/{mate}");
            writer.write(&id, None, b"ACGT", b"IIII").unwrap();
        }
    }

    fn record_ids(path: &Path) -> Vec<String> {
        fastq::Reader::new(open_fastq_reader(path).unwrap())
            .records()
            .map(|record| record.unwrap().id().to_string())
            .collect()
    }

    #[test]
    fn caps_fastq_files_and_preserves_pair_selection() {
        let temp_dir = std::env::temp_dir().join(format!(
            "primer-id-downsampling-{}",
            std::process::id()
        ));
        let r1 = temp_dir.join("sample_R1.fastq.gz");
        let r2 = temp_dir.join("sample_R2.fastq.gz");
        std::fs::create_dir_all(&temp_dir).unwrap();
        write_fastq(&r1, 20, 1);
        write_fastq(&r2, 20, 2);

        downsample_sequence_files(temp_dir.to_str().unwrap(), 7, |_, _| Ok(())).unwrap();

        let r1_ids = record_ids(&r1);
        let r2_ids = record_ids(&r2);
        assert_eq!(r1_ids.len(), 7);
        assert_eq!(r2_ids.len(), 7);
        assert_eq!(
            r1_ids
                .iter()
                .map(|id| id.split('/').next().unwrap())
                .collect::<Vec<_>>(),
            r2_ids
                .iter()
                .map(|id| id.split('/').next().unwrap())
                .collect::<Vec<_>>()
        );

        std::fs::remove_dir_all(temp_dir).unwrap();
    }
}
