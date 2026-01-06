use anyhow::{ Context, Result };
use flate2::write::GzEncoder;
use flate2::Compression;
use std::fs;
use std::io;
use std::path::{ Path, PathBuf };
use std::time::{ SystemTime, UNIX_EPOCH };
use zip_extensions::*;

fn copy_dir_all(src: impl AsRef<Path>, dst: impl AsRef<Path>) -> io::Result<()> {
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

fn unique_suffix() -> String {
    let pid = std::process::id();
    let nanos = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_nanos();
    format!("{}-{}", pid, nanos)
}

/// Atomically replaces `final_path` with `tmp_path` (best-effort on Windows, atomic on Unix).
fn finalize_atomic(tmp_path: &Path, final_path: &Path) -> Result<()> {
    // On Unix, rename is atomic if same filesystem.
    // If the destination exists, remove it first to avoid rename errors on Windows.
    if final_path.exists() {
        fs::remove_file(final_path).context("Failed to remove existing archive file")?;
    }

    fs
        ::rename(tmp_path, final_path)
        .with_context(|| {
            format!(
                "Failed to rename temp archive '{}' -> '{}'",
                tmp_path.display(),
                final_path.display()
            )
        })?;

    Ok(())
}

pub fn compress_dir(
    compression_type: &str,
    job_id: &str,
    input_location: &str,
    output_location: &str
) -> Result<(PathBuf, String)> {
    // Always ensure output directory exists first
    let out_dir = Path::new(output_location);
    if !out_dir.exists() {
        fs::create_dir_all(out_dir).context("Failed to create output directory")?;
    }

    let extension = if compression_type == "tar" { ".tar.gz" } else { ".zip" };
    let compressed_filename = format!("{}{}", job_id, extension);
    let final_archive: PathBuf = out_dir.join(&compressed_filename);

    // Write to a unique temp file in the same output dir, then rename into place
    let tmp_name = format!("{}.partial-{}", compressed_filename, unique_suffix());
    let tmp_archive = out_dir.join(tmp_name);

    // Ensure we don't accidentally write into an existing directory path
    if tmp_archive.exists() {
        fs::remove_file(&tmp_archive).context("Failed to remove existing temp archive file")?;
    }

    let input_path = Path::new(input_location);
    if !input_path.is_dir() {
        anyhow::bail!("input_location is not a directory: {}", input_path.display());
    }

    if compression_type == "tar" {
        let tar_gz = fs::File::create(&tmp_archive).context("Failed to create temp archive file")?;
        let enc = GzEncoder::new(tar_gz, Compression::default());
        let mut tar = tar::Builder::new(enc);

        // Put contents under a top-level directory named job_id inside the archive
        tar.append_dir_all(job_id, input_path).context("Failed to append tar directories")?;

        // IMPORTANT: finish writers so bytes are flushed
        let enc = tar.into_inner().context("Failed to finalize tar builder")?;
        enc.finish().context("Failed to finalize gzip stream")?;
    } else {
        // Create a unique temp folder next to output_location (or inside it)
        // Prefer inside output_location to stay on same filesystem
        let temp_folder = out_dir.join(format!("ziptmp-{}", unique_suffix()));
        let named_input_location = temp_folder.join(job_id);

        // Make sure temp folder is clean
        if temp_folder.exists() {
            fs::remove_dir_all(&temp_folder).context("Failed to remove existing temp folder")?;
        }
        fs::create_dir_all(&named_input_location).context("Failed to create temp directory")?;

        // Copy into a folder named job_id so zip has a top-level directory
        copy_dir_all(input_path, &named_input_location).context("Failed to copy directories")?;

        // Create zip at tmp_archive from temp_folder
        zip_create_from_directory(&tmp_archive, &temp_folder).context("Failed to zip directory")?;

        // Cleanup temp folder
        fs::remove_dir_all(&temp_folder).context("Failed to remove temp directory")?;
    }

    // Atomically publish final file
    finalize_atomic(&tmp_archive, &final_archive)?;

    Ok((final_archive, compressed_filename))
}
