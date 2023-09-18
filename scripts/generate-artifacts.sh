#!/bin/bash

# Please, run this script from the root folder!

if [ -z "$1" ]; then
    echo "Error: Please provide the name of the package"
    exit 1
fi

PACKAGE=$1
ARTIFACTS_PATH=packages/$PACKAGE/artifacts
CIRCUIT_PATH=packages/$PACKAGE/circuits
PTAU=13

if [ "$2" ]; then
    PTAU=$2
fi

# Check if the necessary ptau file already exists. If it does not exist, it will be downloaded.
if [ ! -f ptau/powersOfTau28_hez_final_${PTAU}.ptau ]; then
    wget -P ptau https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_${PTAU}.ptau
fi

# Delete the 'artifacts' folder, if it exists.
rm -r -f $ARTIFACTS_PATH

# Create the 'artifacts' folder.
mkdir -p $ARTIFACTS_PATH

# Compile the circuit.
circom $CIRCUIT_PATH/index.circom --r1cs --wasm --sym --c -o $ARTIFACTS_PATH

# Generate a .zkey file that will contain the proving and verification keys together with all phase 2 contributions.
snarkjs groth16 setup $ARTIFACTS_PATH/index.r1cs ptau/powersOfTau28_hez_final_${PTAU}.ptau $ARTIFACTS_PATH/index_0000.zkey

# Contribute to the phase 2 of the ceremony.
snarkjs zkey contribute $ARTIFACTS_PATH/index_0000.zkey $ARTIFACTS_PATH/index_final.zkey --name="Unsafe devmode contribution" -v -e="Random text"

# Export the verification key.
snarkjs zkey export verificationkey $ARTIFACTS_PATH/index_final.zkey $ARTIFACTS_PATH/verification_key.json

mv $ARTIFACTS_PATH/verification_key.json $ARTIFACTS_PATH/circuit.json
mv $ARTIFACTS_PATH/index_final.zkey $ARTIFACTS_PATH/circuit.zkey
mv $ARTIFACTS_PATH/index_js/index.wasm $ARTIFACTS_PATH/circuit.wasm

rm -fr $ARTIFACTS_PATH/verification_key.json $ARTIFACTS_PATH/index*
