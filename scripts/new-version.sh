#!/bin/bash

# Default to using the npm registry, use REGISTRY env var to override, for
# example to publish to Verdaccio you might set REGISTRY=http://localhost:4873
: "${REGISTRY:=https://registry.npmjs.org}"

# Create the changeset, selecting which packages are included
yarn changeset
# Assign new versions to affected packages
yarn changeset version 

# The path to this script, i.e. one level down from the root of the repo
full_path=$(realpath $0)
# Get the path to the parent directory, i.e. the root of the repo 
dir_path=$(dirname $(dirname $full_path))
cyan_bold='\033[36;1m'

# Loop over each package
# for dir in $dir_path/packages/*/*;
# do
#   # Extract the package name from the path
#   package_name=$(basename $dir)
#   echo -e "Publishing package ${cyan_bold}$package_name\033[0m"
#   # Publish the package
#   # This might fail if the current version of the package has already been
#   # published, but this is unlikely since new versions were assigned by
#   # `yarn changeset version`. Failure of a single package to publish will
#   # not prevent other packages from publishing.
#   cd $dir && yarn publish --registry=$REGISTRY --non-interactive
# done
