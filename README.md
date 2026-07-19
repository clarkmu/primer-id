# Primer-ID Platform

A researcher-facing web platform for submitting, processing, and reviewing HIV next-generation sequencing analyses.

[Visit Primer-ID](https://primer-id.org)

## Overview

Primer-ID provides a unified interface for computational pipelines used in HIV sequencing research. It allows researchers to submit sequencing data without needing to manually configure pipeline dependencies, transfer files between systems, or interact directly with an HPC scheduler.

The platform connects a web application with established scientific pipelines and institutional high-performance computing resources. It manages file submission, validation, job execution, status tracking, result delivery, and researcher-facing error reporting.

## Supported analyses

The platform supports several HIV sequencing workflows:

- **Template Consensus Sequence (TCS)** — constructs consensus sequences from Primer-ID-tagged sequencing reads
- **Drug Resistance (DR)** — identifies relevant HIV drug-resistance mutations
- **Transmission Clustering (TCS)** — supports analysis of genetically related viral sequences
- **Outgrowth Virus Dating (OGV)** — estimates integration dates of outgrowth viruses using longitudinal RNA sequence data
- **HIV Proviral Intactness** — evaluates proviral sequences for evidence of genome intactness
- **Coreceptor Tropism** — predicts HIV coreceptor usage

Pipeline availability and documentation are maintained at [primer-id.org](https://primer-id.org).

## Why this project exists

The underlying scientific tools were developed as separate research pipelines with different environments, dependencies, inputs, and execution models.

Primer-ID operationalizes those tools as a shared research platform by providing:

- A consistent submission workflow across pipelines
- Validation of uploaded files and submission metadata
- Secure handling of large sequencing datasets
- Automated HPC job preparation and execution
- Submission and processing status tracking
- Researcher-readable failure messages
- Centralized result retrieval
- A maintainable interface for adding and updating pipelines

This lets researchers use specialized computational methods without having to reproduce each pipeline's infrastructure locally.

## System architecture

```text
Researcher
    |
    v
Next.js web application
    |
    +-- Submission forms and validation
    +-- Authentication and researcher access
    +-- Submission metadata and status tracking
    +-- Result presentation and downloads
    |
    v
Processing service
    |
    +-- Queue management
    +-- Pipeline-specific job preparation
    +-- File staging
    +-- HPC submission and monitoring
    +-- Error normalization
    |
    v
SLURM high-performance computing environment
    |
    +-- Template consensus and drug resistance
    +-- Outgrowth virus dating
    +-- Proviral intactness
    +-- Coreceptor tropism
    |
    v
Processed results returned to the web platform
```

## Engineering highlights

- Integrated independently developed scientific pipelines behind one web interface
- Adapted research code for reproducible execution in shared computing environments
- Automated transfer and processing of large NGS input files
- Connected researcher-facing submissions to SLURM-scheduled HPC jobs
- Added persistent submission, processing, and result-status tracking
- Improved error handling so researchers receive actionable messages instead of raw pipeline failures
- Supported local development, testing, and production HPC environments
- Maintained compatibility as pipelines and institutional infrastructure evolved

## Technology

### Web application

- Next.js
- React
- TypeScript
- Tailwind CSS
- Prisma
- Cypress

### Processing and infrastructure

- Rust
- Python
- PHP
- Bash
- SLURM
- Linux
- Docker
- Cloud object storage

## Repository structure

```text
.
├── src/                 # Next.js application
├── public/              # Static web assets
├── prisma/              # Database schema and migrations
├── cypress/             # End-to-end tests
└── HPC/                 # Processing service and HPC integration
    ├── src/             # Queue and pipeline-processing logic
    ├── environment_setup/
    ├── g2p/
    └── legacy/
```

## Related pipeline repositories

### Template Consensus Sequence and Drug Resistance

[ViralSeq/viral_seq](https://github.com/ViralSeq/viral_seq)

Provides the underlying Template Consensus Sequence and Drug Resistance workflows.

### Outgrowth Virus Dating

[clarkmu/ogv-dating](https://github.com/clarkmu/ogv-dating)

Maintained platform-compatible version of the OGV dating workflow.

Original research repository:

[veg/ogv-dating](https://github.com/veg/ogv-dating)

### HIV Proviral Intactness

[clarkmu/Intactness-Pipeline](https://github.com/clarkmu/Intactness-Pipeline)

Containerized and HPC-enabled workflow for analyzing HIV proviral intactness.

## Local development

> The complete production environment depends on institutional infrastructure, HPC resources, pipeline executables, and environment-specific configuration. These instructions cover the application-level setup only.

### Prerequisites

- Node.js
- Yarn
- A configured database
- Environment variables required by the application
- Pipeline dependencies for backend processing

### Install the web application

```bash
git clone https://github.com/clarkmu/primer-id.git
cd primer-id
yarn install
```

### Configure the application

Create the required local environment file and configure the database and storage values for your environment.

Then initialize the Prisma client:

```bash
yarn prisma generate
```

Apply the appropriate database migrations for your environment before starting the application.

### Run the development server

```bash
yarn dev
```

The application will normally be available at:

```text
http://localhost:3000
```

### Database browser

```bash
npx prisma studio
```

### Tests

Run the project's configured test and lint commands from `package.json`.

For Cypress development:

```bash
npx cypress open
```

## HPC processing setup

The processing environment is located under [`HPC/`](./HPC).

Bootstrap the pipeline environment and verify its dependencies:

```bash
cd HPC
./bootstrap_and_verify.sh
```

Refresh downloaded pipeline repositories and rebuild their targets:

```bash
./bootstrap_and_verify.sh --refresh-repos
```

Additional environment-specific configuration is required for executable locations, storage locations, SLURM settings, and institutional infrastructure.

See [`HPC/README.md`](./HPC/README.md) for backend setup details.

## Project status

Primer-ID is an actively maintained research software platform. Production deployment requires infrastructure and datasets that are not included in this public repository.

The source is published to document the platform architecture, support reproducibility, and provide a reference for integrating scientific pipelines with researcher-facing applications and HPC systems.

## Funding and acknowledgment

The Primer-ID web application was established with support from the National Institutes of Health and UNC Information Technology Services.

The scientific pipelines integrated by this platform were developed by their respective research teams and contributors. Primer-ID provides the application, infrastructure, workflow integration, and operational support required to make those pipelines accessible through a shared research platform.

## Contact

**Michael Clark**
Research Software Engineer

- Portfolio: [clarkmu.com](https://clarkmu.com)
- GitHub: [github.com/clarkmu](https://github.com/clarkmu)
- ORCID: [0009-0000-5312-1867](https://orcid.org/0009-0000-5312-1867)
