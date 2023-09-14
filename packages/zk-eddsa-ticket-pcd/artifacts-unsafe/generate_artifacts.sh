# This script performs circuit-specific setup and generates all necessary
# artifacts for using eddsaTicket.circom.
#
# !!!! This is dev-mode setup and not secure for production use!!!!
#
# Prerequisites:
# - Circom 2 compiler, installable from here: https://docs.circom.io/getting-started/installation/
# - Powers-of-tau setup ceremony.
#   This script assumes power 13 for 8K max constraints.
#   The file powersOfTau28_hez_final_13.ptau is referenced here:
#   https://github.com/iden3/snarkjs/blob/master/README.md

rm -rf eddsaTicket_js
rm eddsaTicket_0000.zkey
rm eddsaTicket_0001.zkey
rm eddsaTicket.r1cs
rm eddsaTicket.zkey
rm verification_key.json
rm -rf ../../../apps/passport-client/public/zkeddsa-artifacts-unsafe
rm -rf ../../../apps/passport-server/public/zkeddsa-artifacts-unsafe
rm -rf ../../../apps/consumer-client/public/zkeddsa-artifacts-unsafe

circom eddsaTicket.circom --r1cs --wasm
snarkjs groth16 setup eddsaTicket.r1cs powersOfTau28_hez_final_13.ptau eddsaTicket_0000.zkey
snarkjs zkey contribute eddsaTicket_0000.zkey eddsaTicket_0001.zkey --name="Unsafe devmode contribution" -v
snarkjs zkey beacon eddsaTicket_0001.zkey eddsaTicket.zkey 0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f 10 -n="Final Beacon phase2"
snarkjs zkey export verificationkey eddsaTicket.zkey verification_key.json

mkdir ../../../apps/passport-client/public/zkeddsa-artifacts-unsafe
cp eddsaTicket.zkey ../../../apps/passport-client/public/zkeddsa-artifacts-unsafe
cp verification_key.json ../../../apps/passport-client/public/zkeddsa-artifacts-unsafe
cp eddsaTicket_js/eddsaTicket.wasm ../../../apps/passport-client/public/zkeddsa-artifacts-unsafe

mkdir ../../../apps/passport-server/public/zkeddsa-artifacts-unsafe
cp eddsaTicket.zkey ../../../apps/passport-server/public/zkeddsa-artifacts-unsafe
cp verification_key.json ../../../apps/passport-server/public/zkeddsa-artifacts-unsafe
cp eddsaTicket_js/eddsaTicket.wasm ../../../apps/passport-server/public/zkeddsa-artifacts-unsafe

mkdir ../../../apps/consumer-client/public/zkeddsa-artifacts-unsafe
cp eddsaTicket.zkey ../../../apps/consumer-client/public/zkeddsa-artifacts-unsafe
cp verification_key.json ../../../apps/consumer-client/public/zkeddsa-artifacts-unsafe
cp eddsaTicket_js/eddsaTicket.wasm ../../../apps/consumer-client/public/zkeddsa-artifacts-unsafe