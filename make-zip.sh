#!/bin/bash -ex
V=$(cat src/manifest.json | jq -Mr .version)
rm -rf "autofocus-$V.zip"
cd src
zip -r "../autofoucus-$V.zip" . -x '*.git*' -x '*DS_Store'