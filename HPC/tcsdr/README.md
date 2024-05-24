# Use conda env `tcsdr`

# Setup

create the environment

```
conda create -n tcsdr python=3.9 ruby r-base
```

install ruby dependencies

```
gem install viral_seq
```

run pipeline by setting conda environment now that we have multiple

```
tcs -p /path/to/params.json
```
