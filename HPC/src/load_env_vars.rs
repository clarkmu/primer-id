pub struct EnvVars {
    pub is_dev: bool,
    pub id: String,
    pub is_stale: String,
}

pub fn load_env_vars() -> EnvVars {
    let args: Vec<String> = std::env::args().collect();
    let is_dev = args.iter().any(|e| e.contains("is_dev"));

    // todo probably a better way to retrieve this
    let id: String = args
        .iter()
        .find(|e| e.contains("id"))
        .unwrap_or(&String::from(""))
        .to_string()
        .replace("--id=", "");

    let is_stale: String = args
        .iter()
        .find(|e| e.contains("is_stale"))
        .map(|e| e.to_string())
        .unwrap_or(String::from(""));

    EnvVars { is_dev, id, is_stale }
}
