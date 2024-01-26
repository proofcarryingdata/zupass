#!/bin/bash
if [[ -z $DISABLE_BUILD_CACHE ]]; then
  yarn turbo run build
else
  yarn turbo run build --no-cache --force
fi