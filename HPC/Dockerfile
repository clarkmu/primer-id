# FROM rust:1.78
FROM redhat/ubi9

ENV CARGO_TARGET_DIR=/tmp/target

# add MiniConda to PATH
ENV PATH="/root/miniconda3/bin:${PATH}"
ARG PATH="/root/miniconda3/bin:${PATH}"

ENV PORT=8180

# Rust Reqwest OpenSSL
ENV OPENSSL_LIB_DIR=/usr/lib64
ENV OPENSSL_INCLUDE_DIR=/usr/include

WORKDIR /app

RUN dnf update -y

# tools and lldb for Rust
RUN dnf install -y wget git vim lldb
# Install rustup + nightly
RUN wget -qO- https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:$PATH"

# Rust Reqwest OpenSSL
RUN dnf install -y openssl openssl-devel perl



#Install GCP CLI for file transfers
RUN wget \
    https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-cli-linux-x86_64.tar.gz \
    && mkdir /root/google-cloud-sdk \
    && tar -xvf google-cloud-cli-linux-x86_64.tar.gz -C /root \
    && rm -f google-cloud-cli-linux-x86_64.tar.gz
ENV PATH="$PATH:/root/google-cloud-sdk/bin"

# Anaconda (MiniConda) https://docs.conda.io/projects/conda/en/latest/user-guide/install/macos.html
RUN wget \
    https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh \
    && mkdir -p /root/.conda \
    && bash Miniconda3-latest-Linux-x86_64.sh -b \
    && rm -f Miniconda3-latest-Linux-x86_64.sh

# conda env setup
RUN conda init bash

# install all Anaconda packages silently
RUN conda config --env --set always_yes true

# add channels
RUN conda config --add channels defaults \
 && conda config --add channels bioconda \
 && conda config --add channels conda-forge \
 && conda config --set channel_priority strict

# accept Conda Terms of Service (do this BEFORE any conda create/install)
RUN conda tos accept --channel defaults \
 && conda tos accept --channel conda-forge \
 && conda tos accept --channel bioconda

# TCS-DR dependencies
RUN conda create -n tcsdr python=3.9 ruby=3.4.2 r-base r-essentials r-igraph r-phangorn
RUN conda run -n tcsdr gem install viral_seq -v '1.10.0'

# add additional R dependencies if Ruby/R env can't figure it out
# conda install -n tcsdr r-ggplot2 r-tweenr r-polyclip r-systemfonts r-ggforce r-cowplot

# OGV dependencies
RUN conda create -n ogv python=3.9 snakemake raxml-ng bioconda:hyphy==2.5.61 mafft nodejs==12.4.0
RUN conda run -n ogv pip3 install requests biopython
RUN mkdir /app/ogv-dating
RUN git clone https://github.com/clarkmu/ogv-dating /app/ogv-dating -b env-setup
RUN chmod +x /app/ogv-dating/FastTree
RUN conda run -n ogv npm i --prefix /app/ogv-dating/
### ON SETUP - edit /app/ogv-dating/Snakefile::callables - 'fasttree' : '/app/ogv-dating/FastTree', 'classifier' : '/app/ogv-dating/scripts/compute-distance.js'

# INTACTNESS dependencies
RUN conda create -n intactness python=3.8 bioconda::blast=2.12.0 bioconda::muscle=5.1
RUN conda run -n intactness pip3 install requests biopython==1.79 reportlab==4.1.0 lxml==5.1.0 PyPDF2==1.26.0 scipy==1.10.1
RUN mkdir /app/intactness
RUN git clone https://github.com/clarkmu/intactness-pipeline /app/intactness

# CORECEPTOR dependencies
RUN conda create -n coreceptor python=3.10 selenium=4.28.0
RUN conda run -n coreceptor pip3 install biopython==1.79

# SPLICING dependencies
# RUN conda create -n splicing python=3.10 rust=1.85.0
RUN git clone https://github.com/ViralSeq/viRust-splicing /app/splicing

COPY storage-admin.json /app/storage-admin.json
RUN gcloud auth activate-service-account --key-file /app/storage-admin.json

ENTRYPOINT [ "sleep", "infinity" ]