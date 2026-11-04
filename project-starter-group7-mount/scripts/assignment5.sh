#!/bin/bash

podman run -it -p 3000:3000 -v `pwd`:/home/dev -w /home/dev docker.io/library/node npm run start:sheets
