# Primer-ID

![GitHub](https://img.shields.io/github/license/viralseq/viral_seq)
![Gem](https://img.shields.io/gem/dt/viral_seq?color=%23E9967A)
[![Join the chat at https://gitter.im/viral_seq/community](https://badges.gitter.im/viral_seq/community.svg)](https://gitter.im/viral_seq/community?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

A web application containing bioinformatics tools for processing viral NGS data. https://primer-id.org

## Documentation Links:

This repo adds an interface and means of processing for the pipelines below:

### Viral_Seq (TCS + DR)

https://github.com/ViralSeq/viral_seq

### OGV

http://github.com/clarkmu/ogv-dating

OGV forked from:
http://github.com/veg/ogv-dating

## Development setup

package.json for setting up web application

HPC/docker.sh for docker container setup

Crons are not setup in docker container , run ogv.php and tcs-dr.php manually when there is a submission to process

HPC/locations.example.php
Rename to locations.php and set location variables
