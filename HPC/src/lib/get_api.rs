use anyhow::{ anyhow, Context, Result };
use reqwest;

use crate::load_locations::{ load_locations, Locations };

pub async fn get_api<State: for<'de> serde::Deserialize<'de>>(url: &str) -> Result<State> {
    let locations: Locations = load_locations().expect("Error loading locations.");

    let response = reqwest::Client
        ::new()
        .get(url)
        .header("x-api-key", &locations.api_key)
        .send().await
        .context("Failed to get API.")?;

    let status = response.status();
    let final_url = response.url().to_string();
    let body = response.text().await.context("Failed to read API response body.")?;

    if !status.is_success() {
        let body_snippet = body.chars().take(500).collect::<String>();
        return Err(anyhow!(
            "API request failed. url={} status={} body={}",
            final_url,
            status,
            body_snippet
        ));
    }

    let data: State = serde_json
        ::from_str(&body)
        .with_context(|| {
            let body_snippet = body.chars().take(500).collect::<String>();
            format!(
                "Invalid JSON response. url={} status={} body={}",
                final_url,
                status,
                body_snippet
            )
        })?;
    Ok(data)
}
