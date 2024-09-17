# FROM rust:1.78
FROM redhat/ubi8

ENV CARGO_TARGET_DIR=/app/target

# add MiniConda to PATH
ENV PATH="/root/miniconda3/bin:${PATH}"
ARG PATH="/root/miniconda3/bin:${PATH}"

ENV PORT=8180

# Rust Reqwest OpenSSL
ENV OPENSSL_LIB_DIR=/bin

WORKDIR /app

RUN yum update -y
RUN yum install -y wget curl git vim lldb rust cargo
# Rust Reqwest OpenSSL
RUN yum install -y openssl openssl-devel perl

#Install GCP CLI for file transfers
RUN wget \
    https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-cli-linux-x86_64.tar.gz \
    && mkdir /root/google-cloud-sdk \
    && tar -xvf google-cloud-cli-linux-x86_64.tar.gz -C /root \
    && rm -f google-cloud-cli-linux-x86_64.tar.gz
RUN export PATH="$PATH:/root/google-cloud-sdk/bin"
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
RUN conda config --add channels defaults
RUN conda config --add channels bioconda
RUN conda config --add channels conda-forge
RUN conda config --set channel_priority strict

# TCS-DR dependencies
RUN conda create -n tcsdr python=3.9 ruby=2.7.2 r-base r-essentials r-igraph r-phangorn
RUN conda run -n tcsdr gem install viral_seq

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

COPY storage-admin.json /app/storage-admin.json
RUN gcloud auth activate-service-account --key-file /app/storage-admin.json

ENTRYPOINT [ "sleep", "infinity" ]