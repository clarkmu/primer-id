# Use conda env `intactness`

# Setup

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
