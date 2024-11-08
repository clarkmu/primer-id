pub struct EnvVars {
    pub is_dev: bool,
    pub is_test: bool,
    pub id: String,
    pub is_stale: String,
    pub cores: usize,
}

pub fn load_env_vars() -> EnvVars {
    let args: Vec<String> = std::env::args().collect();
    let is_dev = args.iter().any(|e| e.contains("is_dev"));
    let is_test = args.iter().any(|e| e.contains("is_test"));

    // todo probably a better way to retrieve this
    let id: String = args
        .iter()
        .find(|e| e.contains("id"))
        .unwrap_or(&String::from(""))
        .to_string()
        .replace("--id=", "");

    let cores: usize = args
        .iter()
        .find(|e| e.contains("cores"))
        .unwrap_or(&String::from(""))
        .to_string()
        .replace("--cores=", "")
        .parse()
        .unwrap_or(1);

    let is_stale: String = args
        .iter()
        .find(|e| e.contains("is_stale"))
        .map(|e| e.to_string())
        .unwrap_or(String::from(""));

    EnvVars { is_dev, is_test, id, is_stale, cores }
}
