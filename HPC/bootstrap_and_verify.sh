#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# PrimerID local bootstrap + verify (macOS, conda-only)
# Idempotent: install if missing, verify if present
# ============================================================

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENVS_DIR="${ROOT_DIR}/environment_setup"
GCLOUD_BIN="${GCLOUD_BIN:-$HOME/google-cloud-sdk/bin/gcloud}"
REFRESH_REPOS=false

case "${1:-}" in
  --refresh-repos|--update-repos)
    REFRESH_REPOS=true
    shift
    ;;
esac

ALL_OK=true

log() { printf "\n\033[1m%s\033[0m\n" "$*"; }
have() { command -v "$1" >/dev/null 2>&1; }
fail() { echo "❌ $1"; ALL_OK=false; }

# ============================================================
# 1) Rust
# ============================================================
log "Checking Rust toolchain..."

if ! have rustup; then
  log "Installing rustup..."
  if have curl; then
    curl https://sh.rustup.rs -sSf | sh -s -- -y
  elif have wget; then
    wget -qO- https://sh.rustup.rs | sh -s -- -y
  else
    fail "curl or wget required to install rustup"
  fi
fi

export PATH="$HOME/.cargo/bin:$PATH"

RUST_TOOLCHAIN="${RUST_TOOLCHAIN:-stable}"
rustup toolchain install "${RUST_TOOLCHAIN}" -c rustfmt -c clippy >/dev/null
rustup default "${RUST_TOOLCHAIN}" >/dev/null
rustc --version >/dev/null 2>&1 || fail "rustc not working"

# ============================================================
# 2) Conda (Miniforge recommended)
# ============================================================
log "Checking conda..."

# Prefer an existing conda if present
if ! have conda; then
  log "conda not found; installing Miniforge (recommended for Apple Silicon)..."

  # Install location (change if you want)
  CONDA_PREFIX="${CONDA_PREFIX:-$HOME/miniforge3}"

  if [[ -d "$CONDA_PREFIX" ]]; then
    # If directory exists but conda not on PATH, add it
    export PATH="$CONDA_PREFIX/bin:$CONDA_PREFIX/condabin:$PATH"
  fi

  if ! have conda; then
    arch="$(uname -m)"
    case "$arch" in
      arm64)  installer="Miniforge3-MacOSX-arm64.sh" ;;
      x86_64) installer="Miniforge3-MacOSX-x86_64.sh" ;;
      *) fail "Unsupported macOS arch: $arch" ;;
    esac

    url="https://github.com/conda-forge/miniforge/releases/latest/download/${installer}"

    tmp="/tmp/${installer}"
    if have curl; then
      curl -L "$url" -o "$tmp"
    else
      wget -O "$tmp" "$url"
    fi

    bash "$tmp" -b -p "$CONDA_PREFIX"
    rm -f "$tmp"

    export PATH="$CONDA_PREFIX/condabin:$PATH"
  fi
fi

conda --version >/dev/null 2>&1 || fail "conda not working"

# Make conda non-interactive and consistent
conda config --set always_yes yes >/dev/null
conda config --set channel_priority strict >/dev/null

# Ensure channels (Miniforge already prefers conda-forge)
conda config --add channels conda-forge >/dev/null || true
conda config --add channels bioconda >/dev/null || true
# You can omit defaults to avoid repo.anaconda.com entirely
# conda config --add channels defaults >/dev/null || true

# ============================================================
# 3) Google Cloud CLI (optional)
# ============================================================
log "Checking gcloud..."

if [[ ! -x "${GCLOUD_BIN}" ]]; then
  log "Installing gcloud..."
  arch="$(uname -m)"
  case "${arch}" in
    x86_64) gcs_arch="darwin-x86_64" ;;
    arm64)  gcs_arch="darwin-arm" ;;
    *) fail "Unsupported arch for gcloud" ;;
  esac

  url="https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-cli-${gcs_arch}.tar.gz"
  if have curl; then
    curl -L "$url" -o /tmp/gcloud.tgz
  else
    wget -O /tmp/gcloud.tgz "$url"
  fi

  tar -xvf /tmp/gcloud.tgz -C "$HOME" >/dev/null
  rm -f /tmp/gcloud.tgz
  "$HOME/google-cloud-sdk/install.sh" --quiet >/dev/null
fi

export PATH="$HOME/google-cloud-sdk/bin:$PATH"

if [[ -f "${ROOT_DIR}/storage-admin.json" ]]; then
  gcloud auth activate-service-account --key-file "${ROOT_DIR}/storage-admin.json" >/dev/null || true
else
  fail "storage-admin.json not found; skipping gcloud auth"
fi

# ============================================================
# 4) Conda environments
# ============================================================
log "Checking conda environments..."

ensure_env() {
  local env="$1"
  local file="$2"

  if conda env list | awk '{print $1}' | grep -qx "$env"; then
    log "Env '$env' exists → verifying"
  else
    log "Creating env '$env'"
    conda env create -f "$file" >/dev/null
  fi
}

# ensure_env tcsdr      "${ENVS_DIR}/tcsdr.yml"
ensure_env ogv        "${ENVS_DIR}/ogv.yml"
ensure_env intactness "${ENVS_DIR}/intactness.yml"
ensure_env tcsdr "${ENVS_DIR}/tcsdr.yml"

# ============================================================
# 5) Post-install verification
# ============================================================
log "Verifying tools..."

# tcsdr
# conda run -n tcsdr python --version >/dev/null || fail "tcsdr python"
# conda run -n tcsdr ruby --version >/dev/null || fail "tcsdr ruby"
# conda run -n tcsdr R --version >/dev/null || fail "tcsdr R"
# conda run -n tcsdr gem list -i viral_seq >/dev/null || \
# conda run -n tcsdr gem install viral_seq -v '1.10.0' >/dev/null

# TODO remove all this after virust-tcs

# yml files won't install ruby gems
conda run -n tcsdr ruby --version >/dev/null || fail "tcsdr ruby"
conda run -n tcsdr R --version >/dev/null || fail "tcsdr R"
conda run -n tcsdr gem install viral_seq -v '1.10.0'

# ogv
conda run -n ogv snakemake --version >/dev/null || fail "snakemake"
conda run -n ogv node --version >/dev/null || fail "node"
conda run -n ogv mafft --version >/dev/null || fail "mafft"
# NOTE: hyphy pin may still fail on Apple Silicon if that version doesn't exist for osx-arm64

# intactness
conda run -n intactness blastn -version >/dev/null || fail "blastn"
# NOTE: blast=2.12.0 may still fail on Apple Silicon if that version doesn't exist for osx-arm64

# ============================================================
# 6) Repos
# ============================================================
log "Checking repos..."

if [[ -d "${ROOT_DIR}/ogv-dating" ]]; then
  if $REFRESH_REPOS; then
    log "Repo 'ogv-dating' exists → pulling latest"
    git -C "${ROOT_DIR}/ogv-dating" pull --ff-only >/dev/null || true
  else
    log "Repo 'ogv-dating' exists → skip update (pass --refresh-repos to pull)"
  fi
else
  git clone https://github.com/clarkmu/ogv-dating "${ROOT_DIR}/ogv-dating" -b env-setup >/dev/null
fi
chmod +x "${ROOT_DIR}/ogv-dating/FastTree" || true
conda run -n ogv npm install --prefix "${ROOT_DIR}/ogv-dating/" >/dev/null || true

# [[ -d "${ROOT_DIR}/intactness" ]] || git clone https://github.com/clarkmu/intactness-pipeline "${ROOT_DIR}/intactness" >/dev/null
if [[ -d "${ROOT_DIR}/splicing" ]]; then
  if $REFRESH_REPOS; then
    log "Repo 'splicing' exists → pulling latest"
    git -C "${ROOT_DIR}/splicing" pull --ff-only >/dev/null || true
  else
    log "Repo 'splicing' exists → skip update (pass --refresh-repos to pull)"
  fi
else
  log "Cloning splicing repo..."
  git clone https://github.com/ViralSeq/viRust-splicing "${ROOT_DIR}/splicing" >/dev/null
fi

if have cargo; then
  log "Building splicing (release)..."
  if cargo build --release --manifest-path "${ROOT_DIR}/splicing/Cargo.toml"; then
    if [[ -x "${ROOT_DIR}/splicing/target/release/virust-splicing" ]]; then
      cp -f "${ROOT_DIR}/splicing/target/release/virust-splicing" "${ROOT_DIR}/"
      log "virust-splicing binary copied to ${ROOT_DIR}"
    else
      fail "virust-splicing binary not found after build"
    fi
  else
    fail "cargo build --release for splicing failed"
  fi
else
  fail "cargo not found; skipping splicing build"
fi

# viRust-tcs repo + build
if [[ -d "${ROOT_DIR}/virust-tcs" ]]; then
  if $REFRESH_REPOS; then
    log "Repo 'virust-tcs' exists → pulling latest"
    git -C "${ROOT_DIR}/virust-tcs" pull --ff-only >/dev/null || true
  else
    log "Repo 'virust-tcs' exists → skip update (pass --refresh-repos to pull)"
  fi
else
  log "Cloning virust-tcs repo..."
  git clone https://github.com/ViralSeq/viRust-tcs "${ROOT_DIR}/virust-tcs" >/dev/null
fi

if have cargo; then
  log "Building virust-tcs (release)..."
  if cargo build --release --manifest-path "${ROOT_DIR}/virust-tcs/Cargo.toml"; then
    if [[ -x "${ROOT_DIR}/virust-tcs/target/release/tcs" ]]; then
      cp -f "${ROOT_DIR}/virust-tcs/target/release/tcs" "${ROOT_DIR}/"
      log "virust-tcs binary copied to ${ROOT_DIR}/tcs"
    else
      fail "virust-tcs binary not found after build"
    fi
  else
    fail "cargo build --release for virust-tcs failed"
  fi
else
  fail "cargo not found; skipping virust-tcs build"
fi

# ============================================================
# Final status
# ============================================================
if $ALL_OK; then
  echo
  echo "All dependencies verified and ready ✅"
else
  echo
  echo "Completed with warnings ❗ — see messages above"
fi
