set -e

cd circom-merkle
yarn
cd ..

cd circom-rsa
yarn
cd ..

cd circuits
yarn
cd ..

cd faucet
yarn
cd ..