#![allow(dead_code)]

use anyhow::{Context, Result};
use flate2::write::GzEncoder;
use flate2::Compression;
use std::fs;
use std::path::PathBuf;
use zip_extensions::*;

pub fn compress_dir(
    compression_type: &str,
    job_id: &str,
    input_location: &str,
    output_location: &str,
) -> Result<(PathBuf, String)> {
    let extension = if compression_type == "tar" {
        ".tar.gz"
    } else {
        ".zip"
    };
    let compressed_filename = format!("{}{}", job_id, extension);

    let archive_file: PathBuf =
        PathBuf::from(&format!("{}/{}", output_location, compressed_filename));

    if !std::path::Path::new(output_location).exists() {
        fs::create_dir_all(output_location).context("Failed to create input location.")?;
    }

    if compression_type == "tar" {
        let tar_gz = fs::File::create(&archive_file).context("Failed to create archive file.")?;
        let enc = GzEncoder::new(tar_gz, Compression::default());
        let mut tar = tar::Builder::new(enc);
        tar.append_dir_all(job_id, input_location)
            .context("Failed to append tar directories.")?;
    } else {
        let source_dir: PathBuf = PathBuf::from(&input_location);
        let parent_dir = source_dir.parent().unwrap();
        let temp_folder = PathBuf::from(format!("{}/temp", &parent_dir.display()));
        let named_input_location = PathBuf::from(format!("{}/{}", temp_folder.display(), &job_id));

        fs::create_dir_all(&named_input_location).context("Failed to create temp directory.")?;

        fs::rename(&input_location, &named_input_location)
            .context("Failed to mv files from input_location to named_input_location.")?;

        zip_create_from_directory(&archive_file, &temp_folder)
            .context("Failed to zip directory.")?;

        // fs::remove_dir_all(&temp_folder).context("Failed to remove temp directory.")?;
    }

    Ok((archive_file, compressed_filename))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_compress_tar() {
        let compression_type = "tar";
        let input_location = "tests/test_1";
        let output_location = "tests/test_compress_tar";

        if !std::path::Path::new(input_location).exists() {
            fs::create_dir_all(input_location).unwrap();
        }

        fs::write(
            format!("{}/test.txt", input_location),
            "This is a test file.",
        )
        .unwrap();

        let (archive_file, _) = compress_dir(
            compression_type,
            "tar_job_id",
            input_location,
            output_location,
        )
        .unwrap();

        assert_eq!(archive_file.exists(), true);

        // fs::remove_dir_all(input_location).unwrap();
        // fs::remove_dir_all(output_location).unwrap();
    }

    #[test]
    fn test_compress_zip() {
        let input_location = "tests/test_2";
        let output_location = "tests/test_compress_zip";

        if !std::path::Path::new(input_location).exists() {
            fs::create_dir_all(input_location).unwrap();
        }

        fs::write(
            format!("{}/test.txt", input_location),
            "This is a test file.",
        )
        .unwrap();

        let (archive_file, _) =
            compress_dir("zip", "zipped_job_id", input_location, output_location).unwrap();

        assert_eq!(archive_file.exists(), true);

        // fs::remove_dir_all(input_location).unwrap();
        // fs::remove_dir_all(output_location).unwrap();
    }
}
