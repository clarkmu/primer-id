# Project Setup

### Run script to initialize environment, download repos, build targets, install packages

```bash
./bootstrap_and_verify.sh
```

# Update repositories and rebuild target files

```bash
./bootstrap_and_verify.sh --refresh-repos
```

<small>Used to use Docker to keep everything organized and environments repeatable. Rust had too many issues with virtualization and Docker was scrapped.</small>

### Edit ogv-dating/Snakefile

./ogv-dating/Snakefile::callables - need to update callables object for executable locations

Ex)
'fasttree' : './ogv-dating/FastTree', 'classifier' : './ogv-dating/scripts/compute-distance.js'

## Server setup:

Placing just /HPC on server at x/x/primer-id

git init
git remote add origin https://github.com/clarkmu/primer-id
git fetch origin optimize-hpc

git sparse-checkout init --no-cone
git sparse-checkout set --no-cone "HPC/\*\*"

git checkout -b optimize-hpc --track origin/optimize-hpc

### Safety

Run these at x/x/primer-id to protect files from getting `git clean`ed

git config core.protectHFS true
git config core.protectNTFS true
