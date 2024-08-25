use std::process::{ Command, Stdio };

use anyhow::{ Result, Context };
use crate::load_locations::{ load_locations, Locations };

pub fn run_command(cmd: &str, current_dir: &str) -> Result<()> {
    let mut dir: String = current_dir.to_string().clone();

    if dir.is_empty() {
        let locations: Locations = load_locations().context("Failed to load locations")?;
        dir = locations.base.clone();
    }

    let commands: Vec<&str> = cmd.split(" ").collect::<Vec<&str>>();
    let program: &str = commands[0];
    let args: Vec<&str> = commands[1..].to_vec();

    let mut command = Command::new(program)
        .args(args)
        .current_dir(dir)
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit())
        .spawn()
        .with_context(|| format!("Failed running command:\n{}", cmd))?;

    let status = command.wait();

    if status.is_err() {
        return Err(anyhow::anyhow!("Failed to run command: {:?}", cmd));
    }

    Ok(())
}

mod tests {
    #[allow(unused_imports)]
    use super::*;

    #[test]
    fn test_run_command() {
        let cmd: &str = "ls";
        let current_dir: &str = "/usr";
        let result = run_command(cmd, current_dir);
        assert!(!result.is_err());
    }

    #[test]
    fn test_returns_error() {
        let cmd: &str = "ls /fake/path";
        let current_dir: &str = "/fake/path";
        let result = run_command(cmd, current_dir);
        assert!(result.is_err());

        // how I usually check for error in (main|process)es
        let mut check: bool = false;
        if let Err(_) = result {
            check = true;
        }
        assert_eq!(check, true);
    }
}
