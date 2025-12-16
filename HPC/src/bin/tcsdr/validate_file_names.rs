use std::path::PathBuf;
use utils::load_locations::{ load_locations, Locations };
use anyhow::{ Result, Context };
use serde::Deserialize;
use reqwest::{ self, header::CONTENT_TYPE };

#[derive(Deserialize)]
struct APIFilesResult {
    #[serde(rename = "fileName")]
    pub file_name: String,
    #[serde(rename = "libName")]
    pub lib_name: Option<String>,
    pub errors: Option<Vec<String>>,
}

#[derive(Deserialize)]
struct APIResult {
    #[serde(rename = "allPass")]
    pub all_pass: bool,
    pub files: Vec<APIFilesResult>,
}

#[derive(Debug)]
pub struct FilesResults {
    pub file_name: String,
    pub lib_name: String,
    pub file_path: PathBuf,
}

#[allow(dead_code)]
pub async fn validate_file_names(files: Vec<PathBuf>) -> Result<Vec<FilesResults>> {
    let Locations { ruby_server, .. } = load_locations().unwrap();

    let filenames: Vec<String> = files
        .iter()
        .map(|f| {
            match f.file_name() {
                Some(f) => {
                    match f.to_str() {
                        Some(f) => f.to_string(),
                        None => "".to_string(),
                    }
                }
                None => "".to_string(),
            }
        })
        .filter(|f| !f.is_empty())
        .collect::<Vec<String>>();

    if files.len() != filenames.len() {
        return Err(
            anyhow::anyhow!("Mismatching vector lengths. Failed to get file name from path.")
        );
    }

    let filenames_csv: String = filenames.join(",");

    let req = reqwest::Client
        ::new()
        .post(format!("{}/validate_file_names", ruby_server))
        .body(filenames_csv)
        .header(CONTENT_TYPE, "text/plain")
        .send().await
        .context("Failed ViralSeq::TcsCore.validate_file_name")?;

    let json = req.json::<serde_json::Value>().await?;
    let result: APIResult = serde_json::from_value(json)?;

    if !result.all_pass {
        let error_msg = result.files
            .iter()
            .filter_map(|f| f.errors.as_ref().map(|errors| (f.file_name.as_str(), errors)))
            .map(|(file_name, errors)|
                format!(
                    "File: {}\n{}",
                    file_name,
                    if errors.is_empty() {
                        "Undefined error message?".to_string()
                    } else {
                        errors.join("\n")
                    }
                )
            )
            .collect::<Vec<String>>()
            .join("\n\n");

        return Err(anyhow::anyhow!("Not all file names passed validation.\n\n{}", error_msg));
    }

    let new_pathbuf = PathBuf::new();

    let files_results: Vec<FilesResults> = result.files
        .into_iter()
        .map(|f| {
            let file_name = f.file_name;
            let lib_name = f.lib_name.unwrap_or_default();
            let file_path = files
                .iter()
                .find(|p| {
                    match p.file_name() {
                        Some(p) => {
                            match p.to_str() {
                                Some(p) => p == file_name,
                                None => false,
                            }
                        }
                        None => false,
                    }
                })
                .unwrap_or(&new_pathbuf)
                .to_path_buf();

            FilesResults {
                file_name,
                lib_name,
                file_path,
            }
        })
        .collect();

    // handle the `unwrap_or`s above
    if files_results.len() != files.len() {
        let failed_file_path = files_results
            .iter()
            .find(|f| f.file_path == new_pathbuf)
            .is_some();

        if failed_file_path {
            return Err(
                anyhow::anyhow!("Mismatching vector lengths. Failed to match file names to paths.")
            );
        }

        let failed_lib_name = files_results
            .iter()
            .find(|f| f.lib_name == "".to_string())
            .is_some();

        if failed_lib_name {
            return Err(
                anyhow::anyhow!("Mismatching vector lengths. Failed to match lib names to paths.")
            );
        }

        return Err(anyhow::anyhow!("Mismatching vector lengths. Unknown error."));
    }

    Ok(files_results)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_validate_file_names() {
        let ff: Vec<PathBuf> = glob
            ::glob("./tests/fixtures/tcsdr/fasta_sample/**/*.fast*")
            .unwrap()
            .map(|f| f.unwrap())
            .collect();

        let result = validate_file_names(ff).await.unwrap();

        dbg!(&result);

        assert_eq!(result.len(), 2);
        assert_eq!(result[1].lib_name, "CAP001");
    }
}
