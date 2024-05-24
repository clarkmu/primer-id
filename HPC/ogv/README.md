# Use conda env `ogv`

# Setup

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
