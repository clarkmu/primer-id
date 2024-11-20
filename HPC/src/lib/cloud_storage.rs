use anyhow::{ Result, Context };
use crate::{ run_command::run_command, load_locations::{ Locations, load_locations } };
use std::process::Command;

pub fn download(from: &str, to_local: &str, download_recursive: bool) -> Result<()> {
    if std::path::Path::new(from).exists() {
        return Ok(());
    }

    let _ = std::fs::create_dir_all(to_local);

    let recursive = if download_recursive { "-r" } else { "" };

    let cmd: String = format!("gsutil cp {} {} {}", recursive, from, to_local);
    run_command(&cmd, "")?;
    Ok(())
}

pub fn upload(from_local: &str, to: &str) -> Result<()> {
    let gs_cp_cmd = format!("gsutil cp {} {}", &from_local, to);
    run_command(&gs_cp_cmd, "")?;
    Ok(())
}

pub fn get_signed_url(location: &str) -> Result<String> {
    // sample output from gsutil signurl
    // URL     HTTP Method     Expiration      Signed URL
    // gs://bucket/file      GET     2022-10-12 07:25:31     https://storage.googleapis.com/user/file?x-goog-signature=...&x-goog-algorithm=...&x-goog-credential=....&x-goog-date=...&x-goog-signedheaders=...

    println!("Bucket location for signed url: {}", &location);

    let Locations { private_key_location, .. } = load_locations().unwrap();

    let args_str = format!("signurl -d 7d -r us-east1 {} {}", private_key_location, &location);
    let args: Vec<&str> = args_str.split(" ").collect::<Vec<&str>>();

    let url = Command::new("gsutil")
        .args(args)
        .output()
        .context("Command failed at generate signed url.")?;

    let command_output = String::from_utf8(url.stdout)?;

    let signed_url: String = command_output
        .split("https://")
        .collect::<Vec<&str>>()
        .pop()
        .context("Failed to generate signed url. API may have changed.")?
        .trim()
        .to_string();

    if !signed_url.contains("storage.googleapis.com") {
        println!("Signed URL failure: {}", &signed_url);
        return Err(anyhow::anyhow!("Failed to generate signed url. API may have changed."));
    }

    Ok(format!("https://{}", signed_url))
}
