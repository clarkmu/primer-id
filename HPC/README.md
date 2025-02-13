# Project Setup

### initial run also builds image

`docker-compose build`

`docker-compose up -d`

### use image CLI

`docker exec -it primerid bash`

### Run Rust with Cargo Watch

`RUST_BACKTRACE=1 cargo watch -c -w src -x 'run -- --is_dev' --poll`

### Edit ogv-dating/Snakefile

./ogv-dating/Snakefile::callables - 'fasttree' : '/app/ogv-dating/FastTree', 'classifier' : '/app/ogv-dating/scripts/compute-distance.js'

# Debugging

Use VSCode's Remote Explorer tab to attach to Docker container `primer-id`. In the new VSCode window, the debugging tab is now usable.

LLDB is also installed in this container for running test debugs.
