/*
    Get path as string to HPC/target/release/{name}
    Used for executable binaries built from HPC/
    Mostly used at bin/process_queue to use builds for runs
*/

pub struct BinNames;

impl BinNames {
    pub const OGV: &str = "ogv";
    pub const TCSDR: &str = "tcsdr";
    pub const INTACTNESS: &str = "intactness";
    pub const SPLICING: &str = "splicing";
    pub const LOCATOR: &str = "locator";
}

pub fn bin_location(name: &str) -> anyhow::Result<String> {
    let bin_dir = std::env
        ::current_exe()?
        .parent()
        .ok_or_else(|| anyhow::anyhow!("No parent for current_exe"))?
        .to_path_buf();
    Ok(bin_dir.join(name).to_string_lossy().into_owned())
}

/*
    Get path as string to HPC/{name}
    Used for external executables at project root (tcs|splicing)
    Installed via setup script /HPC/boostrap_and_verify.sh
*/

pub struct ProjectBinNames;

impl ProjectBinNames {
    pub const TCSDR: &str = "virust-tcs";
    pub const SPLICING: &str = "virust-splicing";
}

pub fn project_root_bin_location(name: &str) -> anyhow::Result<String> {
    let bin_dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR"));
    Ok(bin_dir.join(name).to_string_lossy().into_owned())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::Path;

    #[test]
    fn bin_location_uses_current_exe_dir() {
        let current_dir = std::env::current_exe().unwrap().parent().unwrap().to_path_buf();
        let joined = bin_location("sample-bin").unwrap();
        let joined_path = Path::new(&joined);

        assert_eq!(joined_path.file_name().unwrap(), "sample-bin");
        assert_eq!(joined_path.parent().unwrap(), current_dir);
    }

    #[test]
    fn project_root_bin_location_points_to_target_release() {
        let joined = project_root_bin_location("tcs").unwrap();
        let joined_path = Path::new(&joined);

        assert_eq!(joined_path.file_name().unwrap(), "tcs");
    }
}
