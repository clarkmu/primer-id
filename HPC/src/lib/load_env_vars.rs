use clap::Parser;

#[derive(Parser, Debug)]
#[command(author, version, about = "PrimerID CLI options", long_about = None)]
pub struct EnvVars {
    #[arg(long)]
    pub is_dev: bool,
    #[arg(long)]
    pub is_test: bool,
    #[arg(long, default_value = "")]
    pub id: String,
    #[arg(long, default_value = "")]
    pub is_stale: String,
    #[arg(long, default_value_t = 1)]
    pub cores: usize,
}

pub fn load_env_vars() -> EnvVars {
    EnvVars::parse()
}
