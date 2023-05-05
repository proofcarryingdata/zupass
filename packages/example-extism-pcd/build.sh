mkdir -p ./dist
extism-js ./src/index.js -o ./dist/test.wasm
extism call ./dist/test.wasm count_vowels --input="Hello World" --wasi