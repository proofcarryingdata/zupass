#/bin/bash
set -e

if [[ -z $DISABLE_BUILD_CACHE ]]; then
  yarn turbo run build:ts
  yarn turbo run build:types
else
  yarn turbo run build:ts --no-cache --force
  yarn turbo run build:types --no-cache --force
fi
