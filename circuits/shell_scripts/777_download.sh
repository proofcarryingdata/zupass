mkdir -p ./build/main/main_js

curl -o ./build/main/main.zkey https://zk-faucet.s3.us-west-2.amazonaws.com/main.zkey
curl -o ./build/main/vkey.json https://zk-faucet.s3.us-west-2.amazonaws.com/vkey.json
curl -o ./build/main/main_js/generate_witness.js https://zk-faucet.s3.us-west-2.amazonaws.com/generate_witness.js
curl -o ./build/main/main_js/main.wasm https://zk-faucet.s3.us-west-2.amazonaws.com/main.wasm
curl -o ./build/main/main_js/main.wat https://zk-faucet.s3.us-west-2.amazonaws.com/main.wat
curl -o ./build/main/main_js/witness_calculator.js https://zk-faucet.s3.us-west-2.amazonaws.com/witness_calculator.js
