# This script performs circuit-specific setup and generates all necessary
# artifacts for using eddsaEventTicket.circom.
#
# !!!! This is dev-mode setup and not secure for production use!!!!
#
# Prerequisites:
# - Circom 2 compiler, installable from here: https://docs.circom.io/getting-started/installation/
# - Powers-of-tau setup ceremony.
#   This script assumes power 13 for 8K max constraints.
#   The file powersOfTau28_hez_final_13.ptau is referenced here:
#   https://github.com/iden3/snarkjs/blob/master/README.md

rm -rf eddsaEventTicket_js
rm eddsaEventTicket_0000.zkey
rm eddsaEventTicket_0001.zkey
rm eddsaEventTicket.r1cs
rm eddsaEventTicket.zkey
rm verification_key.json
rm -rf ../../../apps/passport-client/public/zk-eddsa-event-ticket-artifacts-unsafe
rm -rf ../../../apps/passport-server/public/zk-eddsa-event-ticket-artifacts-unsafe

circom eddsaEventTicket.circom --r1cs --wasm
snarkjs groth16 setup eddsaEventTicket.r1cs powersOfTau28_hez_final_13.ptau eddsaEventTicket_0000.zkey
snarkjs zkey contribute eddsaEventTicket_0000.zkey eddsaEventTicket_0001.zkey --name="Unsafe devmode contribution" -v
snarkjs zkey beacon eddsaEventTicket_0001.zkey eddsaEventTicket.zkey 0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f 10 -n="Final Beacon phase2"
snarkjs zkey export verificationkey eddsaEventTicket.zkey verification_key.json

mkdir ../../../apps/passport-client/public/zk-eddsa-event-ticket-artifacts-unsafe
cp eddsaEventTicket.zkey ../../../apps/passport-client/public/zk-eddsa-event-ticket-artifacts-unsafe
cp verification_key.json ../../../apps/passport-client/public/zk-eddsa-event-ticket-artifacts-unsafe
cp eddsaEventTicket_js/eddsaEventTicket.wasm ../../../apps/passport-client/public/zk-eddsa-event-ticket-artifacts-unsafe

mkdir ../../../apps/passport-server/public/zk-eddsa-event-ticket-artifacts-unsafe
cp eddsaEventTicket.zkey ../../../apps/passport-server/public/zk-eddsa-event-ticket-artifacts-unsafe
cp verification_key.json ../../../apps/passport-server/public/zk-eddsa-event-ticket-artifacts-unsafe
cp eddsaEventTicket_js/eddsaEventTicket.wasm ../../../apps/passport-server/public/zk-eddsa-event-ticket-artifacts-unsafe
