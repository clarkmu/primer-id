#![allow(dead_code)]

use zip_extensions::*;
use std::fs;
use flate2::Compression;
use flate2::write::GzEncoder;
use std::path::{ Path, PathBuf };
use anyhow::{ Result, Context };

fn copy_dir_all(src: impl AsRef<Path>, dst: impl AsRef<Path>) -> Result<()> {
    fs::create_dir_all(&dst).context("Failed at create_dir_all")?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        if ty.is_dir() {
            copy_dir_all(entry.path(), dst.as_ref().join(entry.file_name()))?;
        } else {
            fs::copy(entry.path(), dst.as_ref().join(entry.file_name()))?;
        }
    }
    Ok(())
}

// let job_id = if pipeline.job_id.is_empty() { "ogv-results" } else { pipeline.job_id };

pub fn generate_compressed_filename(id: &str, job_id: &str, results_format: &str) -> String {
    let extension: &str = if results_format == "tar" { ".tar.gz" } else { ".zip" };
    let filename = if job_id.is_empty() { id } else { job_id };
    // let filename: String = format!("ogv-results_{}", results_id);
    let compressed_filename = format!("{}{}", filename, extension);
    compressed_filename
}

pub fn compress_dir(
    // job_id: &str,
    compression_type: &str,
    input_location: &str,
    output_location: &str,
    compressed_filename: &str,
    name_of_compressed_folder: &str
) -> Result<PathBuf> {
    let archive_file: PathBuf = PathBuf::from(
        &format!("{}/{}", output_location, compressed_filename)
    );

    if !std::path::Path::new(output_location).exists() {
        fs::create_dir_all(output_location).context("Failed to create input location.")?;
    }

    if compression_type == "tar" {
        let tar_gz = fs::File::create(&archive_file).context("Failed to create archive file.")?;
        let enc = GzEncoder::new(tar_gz, Compression::default());
        let mut tar = tar::Builder::new(enc);
        tar
            .append_dir_all(name_of_compressed_folder, input_location)
            .context("Failed to append tar directories.")?;
    } else {
        // let source_dir: PathBuf = PathBuf::from(&input_location);
        // let named_input_location = PathBuf::from(
        //     format!("{}/{}", &input_location, &name_of_compressed_folder)
        // );
        // zip_create_from_directory(&archive_file, &source_dir).context("Failed to zip directory.")?;

        let source_dir: PathBuf = PathBuf::from(&input_location);
        let parent_dir = source_dir.parent().unwrap();
        let temp_folder = PathBuf::from(format!("{}/temp", &parent_dir.display()));
        let named_input_location = PathBuf::from(
            format!("{}/{}", temp_folder.display(), &name_of_compressed_folder)
        );

        fs::create_dir_all(&named_input_location).context("Failed to create temp directory.")?;

        fs
            ::rename(&input_location, &named_input_location)
            .context("Failed to mv files from input_location to named_input_location.")?;

        zip_create_from_directory(&archive_file, &temp_folder).context("Failed to zip directory.")?;
    }

    Ok(archive_file)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_compressed_filename() {
        let compressed_filename = generate_compressed_filename("1234", "5678", "tar");
        assert_eq!(compressed_filename, "5678.tar.gz");

        let compressed_filename_no_job_id = generate_compressed_filename("1234", "", "zip");
        assert_eq!(compressed_filename_no_job_id, "1234.zip");
    }

    #[test]
    fn test_compress_tar() {
        let compression_type = "tar";
        let input_location = "tests/test_1";
        let output_location = "tests/test_compress";

        let job_id = "job_id";
        let compressed_filename = &format!("{}{}", job_id, ".tar.gz");

        if !std::path::Path::new(input_location).exists() {
            fs::create_dir_all(input_location).unwrap();
        }

        fs::write(format!("{}/test.txt", input_location), "This is a test file.").unwrap();

        let archive_file = compress_dir(
            compression_type,
            input_location,
            output_location,
            compressed_filename,
            job_id
        ).unwrap();

        assert_eq!(archive_file.exists(), true);

        // fs::remove_dir_all(input_location).unwrap();
        // fs::remove_dir_all(output_location).unwrap();
    }

    #[test]
    fn test_compress_zip() {
        let input_location = "tests/test_1";
        let output_location = "tests/test_compress";

        let job_id = "job_id";
        let compressed_filename = &format!("{}{}", job_id, ".zip");

        if !std::path::Path::new(input_location).exists() {
            fs::create_dir_all(input_location).unwrap();
        }

        fs::write(format!("{}/test.txt", input_location), "This is a test file.").unwrap();

        let _ = compress_dir(
            "zip",
            input_location,
            output_location,
            compressed_filename,
            job_id
        ).unwrap();

        let zipped_archive_file = PathBuf::from(
            &format!("{}/{}", output_location, compressed_filename)
        );
        assert_eq!(zipped_archive_file.exists(), true);

        // fs::remove_dir_all(input_location).unwrap();
        // fs::remove_dir_all(output_location).unwrap();
    }
}
