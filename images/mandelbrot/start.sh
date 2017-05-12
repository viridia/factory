#!/bin/bash
set -e
FRAME=$1
ZOOM="$( echo "0.99 ^ $FRAME" | bc -l )"
./mandelbrot \
  --outfile="/usr/nimble/sandbox/image.$( printf "%03d" "$FRAME" )".jpg \
  --zoom=$ZOOM \
  --parallel=8 \
  --step=1000 \
  --center=-1.0077068756069758,-0.3120631244241092
ls -l /usr/nimble/sandbox/
