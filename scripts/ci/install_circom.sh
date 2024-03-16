#!/bin/bash
#
# This script installs circom in a clean environment running a GitHub action.
# This is always a from-scratch install.  Caching is handled outside
# of this script to avoid running every time.

set -ex

if [ -z "$1" ]
then
      echo "usage: $0 [circom-version-tag]"
      exit 1
fi

# Create cibuild folder for output
mkdir -p cibuild
cd cibuild

# Install rustup and cargo
curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh -s -- -y --profile minimal --default-toolchain nightly

# Clone circom from tag specified in $1
git clone -b $1 https://github.com/iden3/circom.git
cd circom

# Build and install circom in path
cargo build --release
cargo install --path circom
