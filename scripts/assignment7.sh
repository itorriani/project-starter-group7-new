#!/bin/bash

export APP_IP=10.88.100.0
export STORAGE_IP=10.88.100.1
export COMPUTE_IP=10.88.100.2

podman run -d --ip $STORAGE_IP -e "STORAGE_*" \
  -v `pwd`:/home/dev -w /home/dev docker.io/library/node npm run start:storage
podman run -d --ip $COMPUTE_IP -e "COMPUTE_*" -e "STORAGE_*" \
  -v `pwd`:/home/dev -w /home/dev docker.io/library/node npm run start:compute
podman run -d --ip $APP_IP -p 3456:3000 -e "APP_*" -e "COMPUTE_*" \
  -v `pwd`:/home/dev -w /home/dev docker.io/library/node npm run start:sheets
