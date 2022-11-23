FROM ubuntu:18.04

# set Miniconda3 in path
ENV PATH="/root/miniconda3/bin:${PATH}"
ARG PATH="/root/miniconda3/bin:${PATH}"
ENV PORT=8180

RUN apt update && apt upgrade -y
RUN apt install software-properties-common npm wget curl libcurl4 -y

#install PHP
RUN add-apt-repository ppa:ondrej/php
RUN DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends tzdata
RUN apt-get install php -y

#TCS requirements
RUN apt install ruby-full r-base -y
RUN gem install viral_seq
RUN R -e "install.packages(c('ape', 'ggplot2', 'scales', 'ggforce', 'cowplot', 'magrittr', 'gridExtra'), , dep=TRUE, lib=NULL)"

# OGV requirements
RUN add-apt-repository ppa:deadsnakes/ppa
RUN apt-get install python3.7 nodejs -y

# Install Muscle
RUN mkdir -p /usr/local/bin && \
    curl https://drive5.com/muscle/downloads3.8.31/muscle3.8.31_i86linux64.tar.gz --output /usr/local/bin/muscle.tar.gz && \
    tar -xvzf /usr/local/bin/muscle.tar.gz -C /usr/local/bin && rm /usr/local/bin/muscle.tar.gz && \
    mv /usr/local/bin/muscle3.8.31_i86linux64 /usr/local/bin/muscle && \
    chmod +x /usr/local/bin/muscle

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

# install snakemake - full install (could try other methods to speed up setup)
RUN conda install -n base -c conda-forge mamba
RUN mamba create -c conda-forge -c bioconda -n snakemake snakemake

# OGV-Dating dependency
RUN conda install raxml-ng
RUN conda install fasttree
RUN conda install hyphy

# INSTALLING RECOMMENDED HYPHY VERSION 2.4-alpha
# apt install libomp-dev libcurl4-openssl-dev libcrypto++-dev libssl-dev
# conda install git CMake=3.12
# git clone -b develop https://github.com/veg/hyphy.git
# cd hyphy
# git reset --hard caad1c4c354f04630b01b715651f5bd05ef0c4ff
# cmake . && make HYPHYMPI && make install
# cd -

# npm packages and versions for OGV-Dating
# commander@2.20.3 common@0.2.5 commonjs@0.0.1 csv-parse@3.1.3 csv@3.1.0 d3@5.6.0 fast-csv@1.2.0 fs@0.0.2 next-transpile-modules@9.0.0 node-fetch@2.6.7 pfs@3.0.0 phylotree@1.0.0-alpha.17 pretty-data@0.40.0 rollup-plugin-node-resolve@5.2.0 underscore@1.13.2

# files copied at docker.sh:start

#Commands that need to be ran after launch
#conda init bash
#conda activate snakemake
#gcloud auth activate-service-account --key-file /home/node/app/ogv-server/storage-admin.json

EXPOSE 8180

WORKDIR /home/node/app

CMD [ "npm", "start" ]
