#!/bin/bash
node build-cms.js
mkdir -p public
ls -A | grep -v -E 'public|node_modules|.git|.github' | xargs -I {} cp -r {} public/
