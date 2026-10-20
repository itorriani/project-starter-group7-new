#!/bin/bash

podman run -it --ip 10.88.100.0 -p 3456:3000 -v `pwd`:/home/dev -w /home/dev docker.io/library/node npm run start:sheets
