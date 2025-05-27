#!/usr/bin/env bash

# NOTE: For safetly this script runs in a dry-run mode by default.  Add
# `--publish` to the command-line to publish packages to NPM.
#
# Script for releasing new NPM package based on changesets.  To prepare for
# this run `yarn changeset add` as part of each PR, or retroactively at
# release time to decide which packages should be released and what kind of
# version increment they receive.  You should also run tests, and ensure any
# unrelated changes are already committed in git.
#
# This script will release all packages in the repo which are marked as
# releasable (via publishConfig.access = "public").  This requires appropriate
# NPM permissions.  To avoid repeated prompts for credentials, you can
# generate a granular access token from npmjs.org and put in your ~/.npmrc
#
# This script performs the following steps
# - Build all packages (to ensure TS is compiled into JS)
# - Increment version numbers based on changesets using `yarn changeset version`
# - Commit versions and changelogs to GIT
# - Release all packages whose version doesn't match the released version
#
# These steps are idempotent.  If there are no new changesets, and all current
# versions are already on NPM, nothing will be published.
#
# After publishing you should push the resulting changes to git (ideally without
# squashing to maintain the commit hash).

set -ex

# Find the root of the monorepo
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
REPO_ROOT_DIR=$( dirname "$SCRIPT_DIR" )
cd "$REPO_ROOT_DIR"

# Ensure all dependencies are updated and packages are built.
yarn
yarn fix-references
yarn build

# Check for stray changes which need to be committed
if [[ `git status --porcelain` ]]; then
  echo "**** Outstanding changes after build.  Commit and test all changes before proceeding."
  exit 1
fi

# Update version number based on existing changesets
yarn changeset version

# Commit results to git
if [[ `git status --porcelain` ]]; then
  git add -A
  git commit -m "NPM package release"
fi

# Default to using the npm registry, use REGISTRY env var to override, for
# example to publish to Verdaccio you might set REGISTRY=http://localhost:4873
: "${REGISTRY:=https://registry.npmjs.org}"

# Publish packages to NPM
if [[ "$1" == "--publish" ]]; then
  yarn changeset publish --no-git-tag
else
  echo "**** Dry run mode.  To publish packages use: $0 --publish"
fi
