const path = require('path');
const assert = require('assert');
const wasmTester = require('circom_tester').wasm;
const utils = require('./utils');

function calcChunks(n) {
  let numChunks = Math.floor(n / 51);
  if (n % 51 !== 0) {
    numChunks += 1;
  }
  return numChunks;
}

describe('Chunkify Test', () => {
  describe('when chunking a 256 bit number', () => {
    it('should chunk it correctly', async () => {
      const cir = await wasmTester(path.join(__dirname, 'circuits', 'chunkify1.circom'));
      const a = BigInt('57896044618658097711785492504343953926634992332820282019728792003956564819949');
      const buf1 = utils.bigIntToLEBuffer(a);
      const asBits1 = utils.buffer2bits(buf1);
      const witness = await cir.calculateWitness({ in: asBits1 }, true);

      const numChunks = calcChunks(asBits1.length);
      let x = BigInt('0');
      for (let i = 0; i < numChunks; i++) {
        x += BigInt(witness[i + 1]) * (BigInt(2) ** (BigInt(i) * BigInt(51)));
      }
      assert.ok(x === a);
    });
  });
});
