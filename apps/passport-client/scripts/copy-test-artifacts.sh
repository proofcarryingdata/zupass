#!/usr/bin/env bash

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
