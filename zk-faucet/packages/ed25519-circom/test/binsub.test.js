const path = require('path');
const assert = require('assert');
const wasmTester = require('circom_tester').wasm;
const utils = require('./utils');

describe('Binary Subtracter Test', () => {
  describe('when performing binary subtraction on two numbers', () => {
    it('should subtract them correctly when first number is greater than second number', async () => {
      const cir = await wasmTester(path.join(__dirname, 'circuits', 'binsub1.circom'));
      const a = BigInt('711785492504343953926634992332820282019728792003956564819949');
      const b = BigInt('711785492504343953926634992332820282019728792003956064819949');
      const buf1 = utils.bigIntToLEBuffer(a);
      const asBits1 = utils.buffer2bits(buf1);
      asBits1.push(0n);
      const buf2 = utils.bigIntToLEBuffer(b);
      const asBits2 = utils.buffer2bits(buf2);
      asBits2.push(0n);
      const witness = await cir.calculateWitness({ in: [asBits1, asBits2] }, true);

      const expected = utils.pad(
        utils.normalize(utils.buffer2bits(utils.bigIntToLEBuffer(a - b))),
        200,
      );
      assert.ok(witness.slice(1, 201).every((u, i) => u === expected[i]));
      assert.equal(witness[201], 0n);
    });
  });

  describe('when performing binary subtraction on two numbers', () => {
    it('should subtract them correctly when second number is greater than first number', async () => {
      const cir = await wasmTester(path.join(__dirname, 'circuits', 'binsub1.circom'));
      const a = BigInt('711785492504343953926634992332820282019728792003956064819949');
      const b = BigInt('711785492504343953926634992332820282019728792003956564819949');
      const buf1 = utils.bigIntToLEBuffer(a);
      const asBits1 = utils.buffer2bits(buf1);
      asBits1.push(0n);
      const buf2 = utils.bigIntToLEBuffer(b);
      const asBits2 = utils.buffer2bits(buf2);
      asBits2.push(0n);
      const witness = await cir.calculateWitness({ in: [asBits1, asBits2] }, true);

      const expected = utils.pad(
        utils.normalize(
          utils.buffer2bits(utils.bigIntToLEBuffer(BigInt(2) ** BigInt(200) - (b - a))),
        ),
        200,
      );
      assert.ok(witness.slice(1, 201).every((u, i) => u === expected[i]));
      assert.equal(witness[201], 1n);
    });
  });
});
