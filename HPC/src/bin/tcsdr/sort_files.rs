use std::path::{ Path, PathBuf };
use anyhow::{ Result, Context };
use glob::glob;

use crate::validate_file_names::{ validate_file_names, FilesResults };

pub async fn sort_files(dir: &str, destination: &str) -> Result<()> {
    if !Path::new(destination).exists() {
        std::fs
            ::create_dir(destination)
            .context("Failed to create destination directory at file sorting.")?;
    }

    let location = Path::new(dir);

    let files: Vec<PathBuf> = glob(location.join("**").join("*.fast*").to_str().unwrap_or(""))?
        .map(|f| f.unwrap())
        .collect();

    let results: Vec<FilesResults> = validate_file_names(files).await.context(
        "Failed to validate file names."
    )?;

    for file in results {
        // /path/to/destination/{lib_name}/{file_name}
        let destination_dir = Path::new(destination).join(file.lib_name);
        let destination = destination_dir.join(file.file_name);

        if !destination_dir.exists() {
            std::fs
                ::create_dir(&destination_dir)
                .with_context(||
                    format!(
                        "Failed to create destination directory while iterating viralseq.result.files.: {}",
                        file.file_path.display()
                    )
                )?;
        }

        std::fs
            ::copy(file.file_path, destination)
            .context("Failed to copy file while iterating viralseq.result.files .")?;
    }

    Ok(())
}

mod tests {
    #[allow(unused_imports)]
    use super::*;

    #[tokio::test]
    async fn test_sort_files() {
        // tests sort_files and ./validate_file_names

        let dir = "./tests/fixtures/tcsdr/dr_control";
        let destination = "./tests/sort_fasta_output";

        let result = sort_files(dir, &destination).await;

        assert!(result.is_ok());

        let files = glob(PathBuf::from(destination).join("**").join("*.fast*").to_str().unwrap())
            .unwrap()
            .map(|f| f.unwrap())
            .collect::<Vec<PathBuf>>();

        assert_eq!(files.len(), 2);
    }
}
