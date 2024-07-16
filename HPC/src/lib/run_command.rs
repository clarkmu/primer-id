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
