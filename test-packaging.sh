#!/usr/bin/env bash

# Exit with error code if any command fails
set -e

# Kill any background processes when script exits
trap "trap - SIGTERM && kill -- -$$" SIGINT SIGTERM EXIT

# Run Verdaccio
yarn verdaccio --config verdaccio.yml > /dev/null 2>&1 & pid=$!

# Verdaccio is configured to allow anonymous uploads. However, the npm client
# won't even try to publish unless it has an auth token.
# We can solve this problem by adding a dummy auth token to ~/.npmrc.
# See https://github.com/verdaccio/verdaccio/issues/212#issuecomment-308578500
if ! grep -q "//localhost:4873/" ~/.npmrc ; then
  echo "Adding dummy auth token to ~/.npmrc"
  echo '//localhost:4873/:_authToken="dummy"' >> ~/.npmrc
fi

# Verdaccio isn't ready to immediately accept connections, so we need to wait
while ! nc -zw 1 localhost 4873; do sleep 1; done

# Publish all of the @pcd packages to Verdaccio
for dir in ./packages/*/*; do (cd $dir && echo $dir && yarn publish --registry=http://localhost:4873/ --non-interactive); done

# Fully reinstall each example app, pulling @pcd packages from Verdaccio
# All other packages will be proxied from yarnpkg as per verdaccio.yml config.
# Remove the --registry flag to use the npm versions instead. 
for dir in ./examples/*; do (cd $dir && yarn install --no-lockfile --registry=http://localhost:4873/); done

# Build create-react-app example
yarn --cwd=./examples/cra build
# Build nextjs example
yarn --cwd=./examples/nextjs build
# Build vite example
yarn --cwd=./examples/vite build
# Build express example
yarn --cwd=./examples/zupass-feed-server build

# Shut down Verdaccio
kill $pid
