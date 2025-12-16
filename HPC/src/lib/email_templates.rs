use chrono::{ Utc, Duration };

use std::fmt::Write;

use crate::{
    load_locations::{ load_locations, Locations, PipelineType },
    pipeline::{ OgvAPI, SplicingAPI, TcsAPI },
    string_map_to_string::string_map_to_string,
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
    let mut content = String::new();

    let uploads = data.uploads.as_deref().unwrap_or(&[]);
    let htsf = data.htsf.as_deref().unwrap_or("");

    write!(content, "ID: {}<br>", data.id).unwrap();

    match data.pool_name.as_deref() {
        Some(pool_name) if !pool_name.is_empty() => {
            write!(content, "Pool Name: {}<br><br>", pool_name).unwrap();
        }
        _ => content.push_str("<br>"),
    }

    if !data.dr_version.is_empty() {
        write!(content, "DR Version: {}<br><br>", data.dr_version).unwrap();
    }

    if !uploads.is_empty() {
        content.push_str("You have uploaded the following sequences:<br><br>");
        content.push_str(
            &string_map_to_string(uploads.iter(), |s, upload| {
                s.push_str(upload.file_name.as_str());
            })
        );
    } else if !htsf.is_empty() {
        let htsf = data.htsf.as_deref().unwrap_or("undefined");
        write!(content, "HTSF Location: {}", htsf).unwrap();
    }

    let receipt = receipt_email_template(&content);

    receipt
}

pub fn generate_ogv_receipt(data: &OgvAPI) -> String {
    // let conversion_html =
    //     "<u>Start2Art</u>:<br>".to_string() +
    //     &data.conversion
    //         .iter()
    //         .map(|(k, v)| format!("{}: {}", k, v))
    //         .collect::<Vec<String>>()
    //         .join("<br>");

    let conversion_html =
        "<u>Start2Art</u>:<br>".to_string() +
        &string_map_to_string(data.conversion.iter(), |s, (k, v)| {
            write!(s, "{}: {}", k, v).unwrap();
        });

    // let uploads_html =
    //     "<u>Uploads</u>:<br>".to_string() +
    //     &data.uploads
    //         .iter()
    //         .map(|u| format!("{}: {}", u.lib_name, u.file_name))
    //         .collect::<Vec<String>>()
    //         .join("<br>");

    let uploads_html =
        "<u>Uploads</u>:<br>".to_string() +
        &string_map_to_string(data.uploads.iter(), |s, u| {
            write!(s, "{}: {}", u.lib_name, u.file_name).unwrap();
        });

    let receipt = receipt_email_template(&format!("{}</br></br>{}", conversion_html, uploads_html));

    receipt
}

pub fn generate_splicing_receipt(data: &SplicingAPI) -> String {
    let mut content = String::new();

    let uploads = data.uploads.as_deref().unwrap_or(&[]);
    let htsf = data.htsf.as_deref().unwrap_or("");

    if !uploads.is_empty() {
        content.push_str("You have uploaded the following sequences:<br><br>");
        content.push_str(
            &string_map_to_string(uploads.iter(), |s, upload| {
                s.push_str(upload.file_name.as_str());
            })
        );
    } else if !htsf.is_empty() {
        let htsf = data.htsf.as_deref().unwrap_or("undefined");
        write!(content, "HTSF Location: {}", htsf).unwrap();
    }

    let receipt = receipt_email_template(&content);

    receipt
}
