#![allow(dead_code)]

use anyhow::{ Context, Result };
use flate2::write::GzEncoder;
use flate2::Compression;
use std::fs;
use std::path::{ Path, PathBuf };
use zip_extensions::*;

fn copy_dir_all(src: impl AsRef<Path>, dst: impl AsRef<Path>) -> std::io::Result<()> {
    fs::create_dir_all(&dst)?;
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

pub fn compress_dir(
    compression_type: &str,
    job_id: &str,
    input_location: &str,
    output_location: &str
) -> Result<(PathBuf, String)> {
    let extension = if compression_type == "tar" { ".tar.gz" } else { ".zip" };
    let compressed_filename = format!("{}{}", job_id, extension);

    let archive_file: PathBuf = PathBuf::from(
        &format!("{}/{}", output_location, compressed_filename)
    );

    if archive_file.exists() {
        fs::remove_file(&archive_file).context("Failed to remove archive file.")?;
    }

    if !std::path::Path::new(output_location).exists() {
        fs::create_dir_all(output_location).context("Failed to create input location.")?;
    }

    if compression_type == "tar" {
        let tar_gz = fs::File::create(&archive_file).context("Failed to create archive file.")?;
        let enc = GzEncoder::new(tar_gz, Compression::default());
        let mut tar = tar::Builder::new(enc);
        tar.append_dir_all(job_id, input_location).context("Failed to append tar directories.")?;
    } else {
        // To create a zip file that outputs the results within a named (job_id) directory ...

        let source_dir: PathBuf = PathBuf::from(&input_location);
        let parent_dir = source_dir.parent().context("Failed to get parent directory.")?;
        let temp_folder = PathBuf::from(format!("{}/temp", &parent_dir.display()));
        let named_input_location = PathBuf::from(format!("{}/{}", temp_folder.display(), &job_id));

        // Create a temp directory to store the named input location
        fs::create_dir_all(&named_input_location).context("Failed to create temp directory.")?;

        // ensure temp files do not already exist
        if named_input_location.metadata().is_ok() {
            fs::remove_dir_all(&temp_folder).context("Failed to remove file.")?;
        }

        // and copy the source directory to the named input location
        copy_dir_all(source_dir, &named_input_location).context("Failed to copy directories.")?;

        // zip the directory
        zip_create_from_directory(&archive_file, &temp_folder).context("Failed to zip directory.")?;

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

        fs::write(format!("{}/test.txt", input_location), "This is a test file.").unwrap();

        let (archive_file, _) = compress_dir(
            compression_type,
            "tar_job_id",
            input_location,
            output_location
        ).unwrap();

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

        fs::write(format!("{}/test.txt", input_location), "This is a test file.").unwrap();

        let (archive_file, _) = compress_dir(
            "zip",
            "zipped_job_id",
            input_location,
            output_location
        ).unwrap();

        assert_eq!(archive_file.exists(), true);

        // fs::remove_dir_all(input_location).unwrap();
        // fs::remove_dir_all(output_location).unwrap();
    }
}
