#!/bin/sh

name="ogv-dating-container"

function _build {
    # remove --platform flag if not using Apple Silicon chip
    docker build -t "$name" ./ --platform linux/amd64
}

function _start {
    docker run -dit -p 8180:8180 \
        --name "$name" \
        -v "$PWD":/home/node/app \
        "$name"
    docker ps
}

function _stop {
    docker stop "$name"
}

function _remove {
    _stop
    docker rm "$name"
}

if [ $1 = "build" ]; then
   _build
elif [ $1 = "start" ]; then
   _start
elif [ $1 = "rebuild" ]; then
    _remove
    _build
    _start
elif [ $1 = "stop" ]; then
    _stop
elif [ $1 = "remove" ]; then
    _remove
elif [ $1 = "bash" ]; then
    docker exec -it "$name" bash
fi