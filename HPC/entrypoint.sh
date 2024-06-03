#! /bin/sh

gcloud auth activate-service-account --key-file /app/storage-admin.json

echo "RUST_BACKTRACE=1 cargo watch -c -w src -x 'run -- --is_dev' --poll"