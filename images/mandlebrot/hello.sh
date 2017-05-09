#!/bin/bash
set -e
NAME="$1"
FRAME="$2"
if [ "${SANDBOX}" == "" ]; then
  echo "\$SANDBOX variable not specified!"
  exit 1
fi
if [ "${NAME}" == "" ]; then
  echo "Missing argument 1 (name)!"
  exit 1
fi
if [ "${FRAME}" == "" ]; then
  echo "Missing argument 2 (index)!"
  exit 1
fi
echo "Generating frame ${FRAME}: ${SANDBOX}/hello_${FRAME}.txt."
echo "Hello, ${NAME}!" > "${SANDBOX}/hello_${FRAME}.txt"
sleep 10
echo "Finished."
exit 0
