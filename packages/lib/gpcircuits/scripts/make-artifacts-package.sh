#!/usr/bin/env bash

set -ex

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

GPCIRCUITS_PACKAGE_DIR="$SCRIPT_DIR/.."
SRC_DIR="$GPCIRCUITS_PACKAGE_DIR/artifacts/prod"

if [ ! -d "$SRC_DIR" ]; then
  echo "$SRC_DIR does not exist."
  exit 1
fi

CIRCOM_SRC_DIR="$GPCIRCUITS_PACKAGE_DIR/circuits/main"

DST_FILE="$GPCIRCUITS_PACKAGE_DIR/artifacts/prod-artifacts.tgz"
TMP_DIR="$GPCIRCUITS_PACKAGE_DIR/build/prod-artifacts-package"
TMP_CIRCUITS_DIR="$TMP_DIR/circom"

cd "$GPCIRCUITS_PACKAGE_DIR"
rm -rf "$DST_FILE"
rm -rf "$TMP_DIR"
mkdir -p "$TMP_DIR/circom"
cp "$SRC_DIR"/*-vkey.json "$TMP_DIR"
cp "$SRC_DIR"/*-pkey.zkey "$TMP_DIR"
cp "$SRC_DIR"/*.wasm "$TMP_DIR"
cp "$SRC_DIR/../../src/circuitParameters.json" "$TMP_DIR"
cp "$CIRCOM_SRC_DIR"/*.circom "$TMP_DIR/circom"
tar -czv -f "$DST_FILE" -C "$TMP_DIR" .
