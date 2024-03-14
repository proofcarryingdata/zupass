#!/bin/bash
if [[ "$DISABLE_BUILD_CACHE" == "1" ]]; then
  echo "skipping build cache"
  yarn turbo run build "$@" --no-cache --force
else
  echo "using build cache"
  yarn turbo run build "$@"
fi