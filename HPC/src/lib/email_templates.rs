use chrono::{ Utc, Duration };

use crate::load_locations::{ load_locations, Locations, PipelineType };

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

pub fn results_email_template(signed_url: String) -> String {
    let download_link = format!(
        "<a href='{}' style='font-size: 16px;'>Download Results</a><br><small>This link expires {}</small>",
        signed_url,
        expiration_date()
    );

    let body = format!(
        "<html><body>Your results are ready for download.<br><br>{}{}</body></html>",
        download_link,
        email_signature()
    );

    body
}
