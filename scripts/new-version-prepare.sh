#!/bin/bash
set -ex

# Default to using the npm registry, use REGISTRY env var to override, for
# example to publish to Verdaccio you might set REGISTRY=http://localhost:4873
: "${REGISTRY:=https://registry.npmjs.org}"

# Ensure the latest code is built
yarn build
# Create the changeset, selecting which packages are included
yarn changeset
# Assign new versions to affected packages
yarn changeset version 
