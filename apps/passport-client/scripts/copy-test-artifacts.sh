#!/usr/bin/env bash

# TODO(POD-P1): Figure out how to build/distribute artifacts to server for prod
# TODO(POD-P2): Create and distribute real artifacts after trusted setup

set -ex

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
PACKAGE_DIR="$SCRIPT_DIR/.."

ARTIFACTS_SRC_DIR="$PACKAGE_DIR/../../packages/lib/gpcircuits/artifacts/test"
SERVER_ARTIFACTS_DIR="$PACKAGE_DIR/public/artifacts/test/proto-pod-gpc"
cd "$PACKAGE_DIR"

mkdir -p "$SERVER_ARTIFACTS_DIR"
rm -rf "$SERVER_ARTIFACTS_DIR"/*.json "$SERVER_ARTIFACTS_DIR"/*.zkey "$SERVER_ARTIFACTS_DIR"/*.wasm
cp "$ARTIFACTS_SRC_DIR"/* "$SERVER_ARTIFACTS_DIR"

echo passport-client/copy-test-artifacts completed successfully!
