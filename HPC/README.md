# Project Setup

### initial run also builds image

`docker-compose up -d`

### use image CLI

`docker exec -it primerid bash`

### Run Rust with Cargo Watch

`RUST_BACKTRACE=1 cargo watch -c -w src -x 'run -- --is_dev' --poll`

### (temp fix) Edit ./ogv-dating/Snakefile

./ogv-dating/Snakefile::callables - 'fasttree' : '/app/ogv-dating/FastTree', 'classifier' : '/app/ogv-dating/scripts/compute-distance.js'

# Use conda env `tcsdr`

## Setup

create the environment

```
conda create -n tcsdr python=3.9 ruby r-base
```

install ruby dependencies

```
gem install viral_seq
```

run pipeline by setting conda environment now that we have multiple

```
tcs -p /path/to/params.json
```

# Use conda env `ogv`

## Setup

create the environment

```
conda create -n ogv python=3.9 snakemake raxml-ng bioconda:hyphy==2.5.61 mafft==7.508 nodejs==12.4.0
```

install python dependencies

```
pip3 install requests biopython
```

run pipeline by setting conda environment now that we have multiple

```
conda run -n ogv --cwd /path/to/ogv-dating python3 /path/to/init_pipeline.py -in /path/**/*.fasta -out /path/**/*.fasta
```

# Use conda env `intactness`

## Setup

create the environment

```
conda create -n intactness python=3.8 bioconda::blast=2.12.0 bioconda::muscle=5.1
```

install python dependencies

```
pip3 install requests biopython==1.79 reportlab==4.1.0 lxml==5.1.0 PyPDF2==1.26.0 scipy==1.10.1
```

run pipeline by setting conda environment now that we have multiple

```
conda run -n intactness --cwd /path/to/Intactness-Pipeline \
    python3 -m intactness -in /path/to/file -email email@example.com
```

# Debugging

Use VSCode's Remote Explorer tab to attach to Docker container `primer-id`. In the new VSCode window, the debugging tab is now usable.

LLDB is also installed in this container for running test debugs.
