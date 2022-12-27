FROM ubuntu:18.04

# set Miniconda3 in path
ENV PATH="/root/miniconda3/bin:${PATH}"
ARG PATH="/root/miniconda3/bin:${PATH}"
ENV PORT=8180

RUN apt update && apt upgrade -y
RUN apt install software-properties-common wget curl libcurl4 -y

#Install GCP CLI for file transfers
RUN curl -sSL https://sdk.cloud.google.com | bash
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

# Snakefile dependencies
RUN conda update conda
RUN conda install snakemake
RUN conda install raxml-ng
RUN conda install fasttree
RUN conda install hyphy
RUN conda install mafft
RUN conda install nodejs
RUN conda install php
RUN conda install ruby
RUN conda install r-base

# result-summary.py dependency
RUN pip3 install biopython

RUN gem install viral_seq

#Commands that need to be ran after launch
#gcloud auth activate-service-account --key-file /home/node/app/ogv-server/storage-admin.json

EXPOSE 8180

WORKDIR /home/node/app

CMD [ "npm", "start" ]
