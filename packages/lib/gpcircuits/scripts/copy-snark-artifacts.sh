#!/usr/bin/env bash

set -ex

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

GPCIRCUITS_PACKAGE_DIR="$SCRIPT_DIR/.."
SRC_DIR="$GPCIRCUITS_PACKAGE_DIR/artifacts/prod"

if [ ! -d "$SRC_DIR" ]; then
  echo "$SRC_DIR does not exist."
  exit 1
fi

SNARK_ARTIFACTS_DIR="$GPCIRCUITS_PACKAGE_DIR/../../../../snark-artifacts"
DST_DIR="$SNARK_ARTIFACTS_DIR/packages/proto-pod-gpc"

if [ ! -d "$DST_DIR" ]; then
  echo "$DST_DIR does not exist."
  exit 1
fi

cd "$GPCIRCUITS_PACKAGE_DIR"
rm -rf "$DST_DIR"/circuitParameters.json "$DST_DIR"/*-vkey.json "$DST_DIR"/*-vkey.zkey "$DST_DIR"/*.wasm
cp "$SRC_DIR"/*-vkey.json "$DST_DIR"
cp "$SRC_DIR"/*-pkey.zkey "$DST_DIR"
cp "$SRC_DIR"/*.wasm "$DST_DIR"
cp "$SRC_DIR/../../src/circuitParameters.json" "$DST_DIR"
