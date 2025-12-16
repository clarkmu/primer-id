use anyhow::{ Context, Result };
use glob::glob;
use std::path::PathBuf;
use std::{ collections::HashMap, path::Path };

/**
 * @brief: sort_files
 * @description:
 * sort_files takes a directory and sorts the files into subdirectories based on their lib name.
 * Also decompresses .gz files.
 * @param dir: directory to search for files
 * @param destination: directory to copy files to
 * @returns: HashMap< "lib_name", { r1: "/path/to/r1_file", r2: "/path/to/r2_file" } >
 */

#[derive(Debug, Clone)]
pub struct RFiles {
    pub r1: Option<String>,
    pub r2: Option<String>,
}

fn parse_rfile(file_name: &str) -> (String, bool, bool) {
    let is_r1 = file_name.to_lowercase().contains("_r1");
    let is_r2 = file_name.to_lowercase().contains("_r2");
    let lib_name = file_name
        .to_lowercase()
        .split(if is_r1 { "_r1" } else { "_r2" })
        .next()
        .unwrap_or("")
        .to_string();
    (lib_name, is_r1, is_r2)
}

pub fn sort_files(dir: &str, destination: &str) -> Result<HashMap<String, RFiles>> {
    let mut results: HashMap<String, RFiles> = HashMap::new();

    if !Path::new(destination).exists() {
        std::fs
            ::create_dir(destination)
            .context("Failed to create destination directory at file sorting.")?;
    }

    let location = Path::new(dir);

    let files: Vec<PathBuf> = glob(location.join("**").join("*.fast*").to_str().unwrap_or(""))?
        .map(|f| f.unwrap())
        .collect();

    for file in files {
        // /path/to/destination/{lib_name}/{file_name}

        let file_name = file.file_name().unwrap().to_str().unwrap_or("").to_owned();

        // if file is compressed, decompress it and get the new name
        let file_name = if file_name.ends_with(".gz") {
            let decompressed_file_name = file_name.trim_end_matches(".gz").to_string();
            let decompressed_path = file.with_file_name(&decompressed_file_name);

            let mut decompressed_file = std::fs::File
                ::create(&decompressed_path)
                .context("Failed to create decompressed file.")?;
            let mut gz_decoder = flate2::read::GzDecoder::new(std::fs::File::open(&file)?);
            std::io
                ::copy(&mut gz_decoder, &mut decompressed_file)
                .context("Failed to decompress file.")?;

            decompressed_file_name
        } else {
            file_name
        };

        let (lib_name, is_r1, is_r2) = parse_rfile(&file_name);

        // let is_r1 = file_name.contains("r1");
        // let is_r2 = file_name.contains("r2");
        // let lib_name = file_name
        //     .to_lowercase()
        //     .split(if is_r1 { "_r1" } else { "_r2" }) // if it's r1, split by _r1, otherwise split by _r2
        //     .next()
        //     .unwrap_or("")
        //     .to_string();

        if lib_name.is_empty() {
            return Err(anyhow::anyhow!("Failed to get lib name from file name: {}", file_name));
        }

        let destination_dir = Path::new(destination).join(&lib_name);
        let destination = destination_dir.join(&file_name);

        if !destination_dir.exists() {
            std::fs
                ::create_dir(&destination_dir)
                .context(
                    format!("Failed to create destination directory for file: {}", &file_name)
                )?;
        }

        std::fs::copy(file, &destination).context("Failed to copy file while sorting.")?;

        // add r file to results object
        if is_r1 {
            results.entry(lib_name).or_insert_with(|| RFiles { r1: None, r2: None }).r1 = Some(
                destination.display().to_string()
            );
        } else if is_r2 {
            results.entry(lib_name).or_insert_with(|| RFiles { r1: None, r2: None }).r2 = Some(
                destination.display().to_string()
            );
        }
    }

    Ok(results)
}

mod tests {
    #[allow(unused_imports)]
    use super::*;

    #[tokio::test]
    async fn test_sort_files() {
        // tests sort_files and ./validate_file_names

        let dir = "./tests/fixtures/splicing/samples";
        let destination = "./tests/splicing_sort_files";

        // if destination exists, delete it
        if Path::new(destination).exists() {
            std::fs::remove_dir_all(destination).unwrap();
        }

        let results = sort_files(dir, &destination);

        assert!(results.is_ok());

        // assert that results first key is "splicing"
        let results = results.unwrap();
        assert!(results.contains_key("splicing"));

        let r1_file = results.get("splicing").unwrap().r1.to_owned();
        let r2_file = results.get("splicing").unwrap().r2.to_owned();
        assert!(r1_file.is_some());
        assert!(r2_file.is_some());

        // assert that r1_file and r2_file exist
        let r1_file = r1_file.unwrap();
        let r2_file = r2_file.unwrap();

        assert!(Path::new(&r1_file).exists());
        assert!(Path::new(&r2_file).exists());

        println!("r1_file: {:?}", r1_file);
        println!("r2_file: {:?}", r2_file);

        // ensure that the files under results['tar'] are uncompressed
        let r1_file = results.get("tar").unwrap().r1.to_owned();
        let r2_file = results.get("tar").unwrap().r2.to_owned();
        assert!(r1_file.is_some());
        assert!(r2_file.is_some());

        // assert that r1_file and r2_file exist
        let r1_file = r1_file.unwrap();
        let r2_file = r2_file.unwrap();

        assert!(Path::new(&r1_file).exists());
        assert!(Path::new(&r2_file).exists());

        // assert that the files are uncompressed
        assert!(!r1_file.ends_with(".gz"));
        assert!(!r2_file.ends_with(".gz"));
    }

    #[test]
    fn test_parse_rfiles() {
        // Test the filename extraction logic
        let test_cases = vec![
            ("A_468d23_CAGATCA_S1_L001_R1_001.fasta", "A_468d23_CAGATCA_S1_L001"),
            ("A_468d23_CAGATCA_S1_L001_r1_001.fasta", "A_468d23_CAGATCA_S1_L001"),
            ("sample_r1.fastq.gz", "sample"),
            ("sample_r2.fastq.gz", "sample"),
            ("another_sample_R1.fastq", "another_sample"),
            ("no_read_number.txt", ""),
            ("_r1.fastq", ""),
            ("r2.fastq", "")
        ];

        for (input, expected) in test_cases {
            let (lib_name, _, _) = parse_rfile(input);
            assert_eq!(lib_name, expected.to_lowercase(), "Failed for input: {}", input);
        }
    }
}
