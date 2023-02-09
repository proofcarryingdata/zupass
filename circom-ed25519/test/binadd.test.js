const path = require('path');
const assert = require('assert');
const wasmTester = require('circom_tester').wasm;
const fc = require('fast-check');
const utils = require('./utils');

describe('Binary Adder Test', () => {
  describe('when performing binary additon on two 8 bit numbers', () => {
    it('should add them correctly', async () => {
      const cir = await wasmTester(path.join(__dirname, 'circuits', 'binadd1.circom'));
      const a = BigInt('128');
      const buf = utils.bigIntToLEBuffer(a);
      const asBits = utils.buffer2bits(buf);
      const witness = await cir.calculateWitness({ in: [asBits, asBits] }, true);

      const expected = utils.pad(utils.buffer2bits(utils.bigIntToLEBuffer(a + a)), 9);
      assert.ok(witness.slice(1, 10).every((u, i) => u === expected[i]));
    });
  });
  describe('when performing binary additon on two 256 bit numbers', () => {
    it('should add them correctly', async () => {
      const cir = await wasmTester(path.join(__dirname, 'circuits', 'binadd2.circom'));
      const a = BigInt('87896044618658097711785492504343953926634992332820282019728792003956564819949');
      const b = BigInt('97896044618658097711785492504343953926634992332820282019728792003956564819948');
      const buf1 = utils.bigIntToLEBuffer(a);
      const asBits1 = utils.buffer2bits(buf1);
      const buf2 = utils.bigIntToLEBuffer(b);
      const asBits2 = utils.buffer2bits(buf2);
      const witness = await cir.calculateWitness({ in: [asBits1, asBits2] }, true);

      const expected = utils.pad(utils.buffer2bits(utils.bigIntToLEBuffer(a + b)), 257);
      assert.ok(witness.slice(1, 258).every((u, i) => u === expected[i]));
    });
  });
  describe('when performing binary addition on two random number of 256 bits', () => {
    it('should add them correctly', async () => {
      const cir = await wasmTester(path.join(__dirname, 'circuits', 'binadd2.circom'));
      await fc.assert(
        fc.asyncProperty(
          fc.bigInt(1n, BigInt(2 ** 256) - 1n),
          fc.bigInt(1n, BigInt(2 ** 256) - 1n),
          async (a, b) => {
            const buf1 = utils.bigIntToLEBuffer(a);
            const buf2 = utils.bigIntToLEBuffer(b);
            const asBits1 = utils.pad(utils.buffer2bits(buf1), 256);
            const asBits2 = utils.pad(utils.buffer2bits(buf2), 256);
            const witness = await cir.calculateWitness({ in: [asBits1, asBits2] }, true);

            const expected = utils.pad(utils.buffer2bits(utils.bigIntToLEBuffer(a + b)), 257);
            return witness.slice(1, 258).every((u, i) => u === expected[i]);
          },
        ),
      );
    });
  });
});
