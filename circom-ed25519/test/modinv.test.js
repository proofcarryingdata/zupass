const path = require('path');
const assert = require('assert');
const wasmTester = require('circom_tester').wasm;
const bigintModArith = require('bigint-mod-arith');
const fc = require('fast-check');
const utils = require('./utils');

describe('Inverse Modulo test for base51', () => {
  describe('when Performing inverse modulo on a 255 bit number', () => {
    const p = BigInt(2 ** 255) - BigInt(19);
    it('Should calculate the inverse correctly', async () => {
      const cir = await wasmTester(path.join(__dirname, 'circuits', 'modinv.circom'));
      const a = BigInt(2 ** 255) - BigInt(20);
      const chunk = utils.chunkBigInt(a, BigInt(2 ** 85));
      const witness = await cir.calculateWitness({ in: chunk }, true);
      const inv = bigintModArith.modInv(a, p);
      const expected = utils.chunkBigInt(inv, BigInt(2 ** 85));
      assert.ok(witness.slice(1, 4).every((u, i) => u === expected[i]));
    });
  });
  describe('when calculating inverse modulo on field elements', () => {
    const p = BigInt(2 ** 255) - BigInt(19);

    it('Should calculate the inverse correctly', async () => {
      const cir = await wasmTester(path.join(__dirname, 'circuits', 'modinv.circom'));
      await fc.assert(
        fc.asyncProperty(fc.bigInt(1n, p - 1n), async (data) => {
          const witness = await cir.calculateWitness(
            { in: utils.pad(utils.chunkBigInt(data, BigInt(2 ** 85)), 3) },
            true,
          );
          const expected = utils.pad(utils.chunkBigInt(
            bigintModArith.modInv(data, p),
            BigInt(2 ** 85),
          ), 3);
          return witness.slice(1, 4).every((u, i) => u === expected[i]);
        }),
      );
    });
  });
});
