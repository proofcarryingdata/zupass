const path = require('path');
const assert = require('assert');
const wasmTester = require('circom_tester').wasm;
const { default: fc } = require('fast-check');
const utils = require('./utils');

describe('base 51 addition test', () => {
  describe('when performing chuncked addition on three 200 bits numbers', () => {
    it('should add them correctly', async () => {
      const cir = wasmTester(path.join(__dirname, 'circuits', 'chunkedadd.circom'));
      const a = BigInt(2 ** 200) - BigInt(19);
      const b = BigInt(2 ** 200) - BigInt(27);
      const c = BigInt(2 ** 200) - BigInt(35);
      const chunk1 = utils.chunkBigInt(a);
      const chunk2 = utils.chunkBigInt(b);
      const chunk3 = utils.chunkBigInt(c);

      const witness = await (await cir).calculateWitness({ in: [chunk1, chunk2, chunk3] }, true);
      const expected = utils.chunkBigInt(a + b + c);
      assert.ok(witness.slice(1, 5).every((u, i) => u === expected[i]));
    });
  });
  describe('when performing chunked addition on four randomly genrated 200 bits numbers', () => {
    it('should add them correctly', async () => {
      const cir = wasmTester(path.join(__dirname, 'circuits', 'chunkedadd1.circom'));
      await fc.assert(
        fc.asyncProperty(
          fc.bigInt(2n, BigInt(2 ** 200) - 19n),
          fc.bigInt(2n, BigInt(2 ** 200) - 27n),
          fc.bigInt(2n, BigInt(2 ** 200) - 35n),
          fc.bigInt(2n, BigInt(2 ** 200) - 45n),
          async (a, b, c, d) => {
            const chunk1 = utils.pad(utils.chunkBigInt(a), 4);
            const chunk2 = utils.pad(utils.chunkBigInt(b), 4);
            const chunk3 = utils.pad(utils.chunkBigInt(c), 4);
            const chunk4 = utils.pad(utils.chunkBigInt(d), 4);

            const witness = await (await cir).calculateWitness(
              { in: [chunk1, chunk2, chunk3, chunk4] },
              true,
            );
            const expected = utils.pad(utils.chunkBigInt(a + b + c + d), 5);
            return witness.slice(1, 6).every((u, i) => u === expected[i]);
          },
        ),
      );
    });
  });
});
