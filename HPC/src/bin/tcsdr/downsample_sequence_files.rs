#![allow(unused)]
use anyhow::{ Context, Result };
use bio::io::fastq::{ self, FastqRead };
use flate2::{ read::GzDecoder, write::GzEncoder, Compression };
use glob::glob;
use std::{ fs::File, io::{ BufRead, BufReader, BufWriter, Write }, path::{ Path, PathBuf } };

pub const MAX_SAMPLES_PER_FILE: usize = 1_000_000;

pub fn downsample_sequence_files<F>(
    samples_dir: &str,
    max_samples: usize,
    mut on_downsampled: F
) -> Result<()>
    where F: FnMut(&Path) -> Result<()>
{
    for file in sequence_files(samples_dir)? {
        if clip_fastq(&file, max_samples)? {
            on_downsampled(&file)?;
        }
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

    file_name.ends_with(".fastq") ||
        file_name.ends_with(".fq") ||
        file_name.ends_with(".fastq.gz") ||
        file_name.ends_with(".fq.gz")
}

fn clip_fastq(path: &Path, max_samples: usize) -> Result<bool> {
    let temp_path = path.with_file_name(
        format!(
            ".{}.downsampling",
            path
                .file_name()
                .and_then(|name| name.to_str())
                .context("FASTQ file name is not valid UTF-8.")?
        )
    );
    let mut reader = fastq::Reader::from_bufread(open_fastq_reader(path)?);
    let mut writer = fastq::Writer::new(open_fastq_writer(&temp_path, is_gzip(path))?);
    let mut record = fastq::Record::new();

    for _ in 0..max_samples {
        reader
            .read(&mut record)
            .with_context(|| format!("Failed to read FASTQ file '{}'.", path.display()))?;

        if record.is_empty() {
            drop(writer);
            std::fs
                ::remove_file(&temp_path)
                .with_context(|| {
                    format!("Failed to remove temporary file '{}'.", temp_path.display())
                })?;
            return Ok(false);
        }

        writer
            .write_record(&record)
            .with_context(|| format!("Failed to clip '{}'.", path.display()))?;
    }

    reader
        .read(&mut record)
        .with_context(|| format!("Failed to read FASTQ file '{}'.", path.display()))?;

    if record.is_empty() {
        drop(writer);
        std::fs
            ::remove_file(&temp_path)
            .with_context(|| {
                format!("Failed to remove temporary file '{}'.", temp_path.display())
            })?;
        return Ok(false);
    }

    drop(writer);

    std::fs
        ::rename(&temp_path, path)
        .with_context(|| {
            format!("Failed to replace '{}' with its clipped file.", path.display())
        })?;

    Ok(true)
}

fn open_fastq_reader(path: &Path) -> Result<Box<dyn BufRead>> {
    let file = File::open(path).with_context(|| format!("Failed to open '{}'.", path.display()))?;

    if is_gzip(path) {
        Ok(Box::new(BufReader::new(GzDecoder::new(BufReader::new(file)))))
    } else {
        Ok(Box::new(BufReader::new(file)))
    }
}

fn open_fastq_writer(path: &Path, gzip: bool) -> Result<Box<dyn Write>> {
    let file = File::create(path).with_context(||
        format!("Failed to create '{}'.", path.display())
    )?;
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
        let mut writer = fastq::Writer::new(open_fastq_writer(path, is_gzip(path)).unwrap());

        for index in 0..record_count {
            let id = format!("sample_{index}/{mate}");
            writer.write(&id, None, b"ACGT", b"IIII").unwrap();
        }
    }

    fn record_ids(path: &Path) -> Vec<String> {
        fastq::Reader
            ::from_bufread(open_fastq_reader(path).unwrap())
            .records()
            .map(|record| record.unwrap().id().to_string())
            .collect()
    }

    #[test]
    fn clips_fastq_files_and_preserves_pair_selection() {
        let temp_dir = std::env
            ::temp_dir()
            .join(format!("primer-id-downsampling-{}", std::process::id()));
        let r1 = temp_dir.join("sample_R1.fastq.gz");
        let r2 = temp_dir.join("sample_R2.fastq.gz");
        std::fs::create_dir_all(&temp_dir).unwrap();
        write_fastq(&r1, 20, 1);
        write_fastq(&r2, 20, 2);

        downsample_sequence_files(temp_dir.to_str().unwrap(), 7, |_| Ok(())).unwrap();

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
        assert_eq!(r1_ids, (0..7).map(|index| format!("sample_{index}/1")).collect::<Vec<_>>());

        std::fs::remove_dir_all(temp_dir).unwrap();
    }
}
