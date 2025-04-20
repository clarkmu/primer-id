use chrono::{ Utc, Duration };

use crate::{
    load_locations::{ load_locations, Locations, PipelineType },
    pipeline::{ OgvAPI, SplicingAPI, TcsAPI },
};

// contact us and outro
fn email_signature() -> String {
    let Locations { api_url, .. } = match load_locations() {
        Ok(locations) => locations,
        Err(_) => {
            return "<br>Primer-ID team @UNC<br>".to_string();
        }
    };
    format!(
        "<br><br>If you have any questions, feel free to <a href=\"{}/contact\">contact us</a>.<br>Primer-ID team @UNC<br>",
        api_url[PipelineType::Base]
    )
}

// try for a printed expiration timestamp else a generic "in 7 days"
fn expiration_date() -> String {
    match Utc::now().checked_add_signed(Duration::days(7)) {
        Some(date) => date.format("%m/%d/%Y").to_string(),
        None => { "In 7 days".to_string() }
    }
}

pub fn receipt_email_template(details: &str) -> String {
    let receipt = format!(
        "<html><body>Your submission details are below:<br><br>{}<br><br>You will receive an email when your results are ready for download.{}</body></html>",
        details,
        email_signature()
    );

    receipt
}

pub fn results_email_template(signed_url: String, extra_notes: &str) -> String {
    let download_link = format!(
        "<a href='{}' style='font-size: 16px;'>Download Results</a><br><small>This link expires {}</small>",
        signed_url,
        expiration_date()
    );

    let body = format!(
        "<html><body>Your results are ready for download.<br><br>{}{}{}</body></html>",
        download_link,
        extra_notes,
        email_signature()
    );

    body
}

pub fn generate_tcs_receipt(data: &TcsAPI) -> String {
    let mut content: String = String::from("");

    let uploads = &data.uploads.clone().unwrap_or(vec![]);
    let htsf = &data.htsf.clone().unwrap_or("".to_string());

    if !uploads.is_empty() {
        content = String::from("You have uploaded the following sequences:\n\n");

        let filenames: Vec<String> = uploads
            .iter()
            .map(|upload| upload.file_name.clone())
            .collect();
        let filenames_str = filenames.join("\n");
        content.push_str(&filenames_str);
    } else if !htsf.is_empty() {
        let htsf = &data.htsf.clone().unwrap_or("undefined".to_string());
        content = format!("HTSF Location: {}", &htsf);
    }

    let receipt = receipt_email_template(&content);

    receipt
}

pub fn generate_ogv_receipt(data: &OgvAPI) -> String {
    let conversion_html =
        "<u>Start2Art</u>:<br>".to_string() +
        &data.conversion
            .iter()
            .map(|(k, v)| format!("{}: {}", k, v))
            .collect::<Vec<String>>()
            .join("<br>");

    let uploads_html =
        "<u>Uploads</u>:<br>".to_string() +
        &data.uploads
            .iter()
            .map(|u| format!("{}: {}", u.lib_name, u.file_name))
            .collect::<Vec<String>>()
            .join("<br>");

    let receipt = receipt_email_template(&format!("{}</br></br>{}", conversion_html, uploads_html));

    receipt
}

pub fn generate_splicing_receipt(data: &SplicingAPI) -> String {
    let mut content: String = String::from("");

    let uploads = &data.uploads.clone().unwrap_or(vec![]);
    let htsf = &data.htsf.clone().unwrap_or("".to_string());

    if !uploads.is_empty() {
        content = String::from("You have uploaded the following sequences:\n\n");

        let filenames: Vec<String> = uploads
            .iter()
            .map(|upload| upload.file_name.clone())
            .collect();
        let filenames_str = filenames.join("\n");
        content.push_str(&filenames_str);
    } else if !htsf.is_empty() {
        let htsf = &data.htsf.clone().unwrap_or("undefined".to_string());
        content = format!("HTSF Location: {}", &htsf);
    }

    let receipt = receipt_email_template(&content);

    receipt
}
