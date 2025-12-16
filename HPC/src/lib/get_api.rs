use anyhow::{ Result, Context };
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

    let json = response.json::<serde_json::Value>().await?;
    let json_pretty = serde_json::to_string_pretty(&json).unwrap_or_default();
    let data: State = serde_json
        ::from_value(json)
        .with_context(|| format!("Invalid JSON: {}", json_pretty))?;
    Ok(data)
}
