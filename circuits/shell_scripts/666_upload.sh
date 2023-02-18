aws s3api put-object --debug --bucket zk-faucet --key main.zkey --body ./build/main/main.zkey
aws s3api put-object --debug --bucket zk-faucet --key vkey.json --body ./build/main/vkey.json
aws s3api put-object --debug --bucket zk-faucet --key generate_witness.js --body ./build/main/main_js/generate_witness.js
aws s3api put-object --debug --bucket zk-faucet --key main.wasm --body ./build/main/main_js/main.wasm
aws s3api put-object --debug --bucket zk-faucet --key main.wat --body ./build/main/main_js/main.wat
aws s3api put-object --debug --bucket zk-faucet --key witness_calculator.js --body ./build/main/main_js/witness_calculator.js