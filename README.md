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

At `/` , run `yarn` to set up web application

At `/HPC` , run `docker-compose up -d` to create backend

Rename `HPC/locations.example.json` to `locations.json` with location variables set

`yarn global add dotenv-cli`

<small>Todo: Make a Dockerfile for frontend</small>

## Processing

To process submisisons , run `cargo run process_queue` at `/HPC` manually (no cron is set up)

## Backend Testing

Open project using VSCode's Remote Explorer to run tests with dependencies

## Database Viewer

`npx prisma studio`
