#!/usr/bin/env bash

# TODO(POD-P1): Figure out how to build/distribute artifacts to server for prod
# TODO(POD-P2): Create and distribute real artifacts after trusted setup

set -ex

GPC_NAMES=(
  "proto-pod-gpc_1o-1e-5md"
  "proto-pod-gpc_1o-5e-8md"
  "proto-pod-gpc_3o-10e-8md"
)

gen_gpc_artifacts()
{
  CIRCUIT_NAME=$1
  npx circomkit instantiate "$CIRCUIT_NAME"
  npx circomkit compile "$CIRCUIT_NAME"
  npx circomkit setup "$CIRCUIT_NAME"
  cp "$CIRCOMKIT_BUILD_DIR/$CIRCUIT_NAME/groth16_vkey.json" "$ARTIFACTS_DIR/$CIRCUIT_NAME-vkey.json"
  cp "$CIRCOMKIT_BUILD_DIR/$CIRCUIT_NAME/groth16_pkey.zkey" "$ARTIFACTS_DIR/$CIRCUIT_NAME-pkey.zkey"
  cp "$CIRCOMKIT_BUILD_DIR/$CIRCUIT_NAME/${CIRCUIT_NAME}_js/$CIRCUIT_NAME.wasm" "$ARTIFACTS_DIR/$CIRCUIT_NAME.wasm"
}

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
PACKAGE_DIR="$SCRIPT_DIR/.."
ARTIFACTS_DIR="$PACKAGE_DIR/artifacts/test"
CIRCOMKIT_BUILD_DIR="$PACKAGE_DIR/build"

cd "$PACKAGE_DIR"
mkdir -p "$ARTIFACTS_DIR"
rm -rf "$ARTIFACTS_DIR"/*.json "$ARTIFACTS_DIR"/*.zkey "$ARTIFACTS_DIR"/*.wasm

for GPC_NAME in ${GPC_NAMES[@]}; do
  gen_gpc_artifacts "$GPC_NAME"
done

echo gpcircuits/gen-test-artifacts completed successfully!
