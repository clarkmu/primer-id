Do not run OGV or Intactness for results -
Package versions are not correct when not using {env}.production.yml

Move from Docker to bootstrap.sh:

locations.dev.json Update
"host.docker.internal" to "localhost"
"/app" to $PWD (of ../../HPC)
