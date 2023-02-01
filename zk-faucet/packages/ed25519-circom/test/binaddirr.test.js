const path = require('path');
const assert = require('assert');
const wasmTester = require('circom_tester').wasm;
const { default: fc } = require('fast-check');
const utils = require('./utils');

describe('Binary addition test for irregular  bits', () => {
  describe('when calculating addition of two binary array of non equal length for test 56 and 40 bits ', () => {
    it('should add them correctly', async () => {
      const cir = await wasmTester(path.join(__dirname, 'circuits', 'binaddirr.circom'));
      const a = BigInt('1125899906842613');
      const b = BigInt('1099511627764');
      const buf1 = utils.bigIntToLEBuffer(a);
      const buf2 = utils.bigIntToLEBuffer(b);
      const bits1 = utils.buffer2bits(buf1);
      const bits2 = utils.buffer2bits(buf2);
      const witness = await cir.calculateWitness({ in1: bits1, in2: bits2 }, true);

      const expected = utils.pad(
        utils.buffer2bits(utils.bigIntToLEBuffer(a + b)),
        57,
      );
      assert.ok(witness.slice(1, 58).every((u, i) => u === expected[i]));
    });
  });
  describe('when calculating addition of two random binary array of non equal length for the test 56 and 40 bits', () => {
    it('should add them correctly', async () => {
      const cir = await wasmTester(path.join(__dirname, 'circuits', 'binaddirr.circom'));
      await fc.assert(
        fc.asyncProperty(
          fc.bigInt(2n, BigInt(2 ** 56) - 1n),
          fc.bigInt(3n, BigInt(2 ** 40) - 1n),
          async (a, b) => {
            const buf1 = utils.bigIntToLEBuffer(a);
            const buf2 = utils.bigIntToLEBuffer(b);
            const bits1 = utils.pad(utils.buffer2bits(buf1), 56).slice(0, 56);
            const bits2 = utils.pad(utils.buffer2bits(buf2), 40).slice(0, 40);
            const witness = await cir.calculateWitness({ in1: bits1, in2: bits2 }, true);

            const expected = utils.pad(
              utils.buffer2bits(utils.bigIntToLEBuffer(a + b)),
              57,
            );
            return witness.slice(1, 58).every((u, i) => u === expected[i]);
          },
        ),
      );
    });
  });
});
