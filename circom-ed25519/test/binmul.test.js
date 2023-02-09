const path = require('path');
const assert = require('assert');
const wasmTester = require('circom_tester').wasm;
const fc = require('fast-check');
const utils = require('./utils');

describe('Binary Multiplier Test', () => {
  describe('when performing binary multiplication on 104 bit and an 40 bit numbers', () => {
    it('should multiply them correctly', async () => {
      const cir = await wasmTester(path.join(__dirname, 'circuits', 'binmul1.circom'));
      const a = BigInt('282028201972879200395656481949');
      const b = BigInt('956564819949');
      const buf1 = utils.bigIntToLEBuffer(a);
      const asBits1 = utils.buffer2bits(buf1);
      const buf2 = utils.bigIntToLEBuffer(b);
      const asBits2 = utils.buffer2bits(buf2);
      const witness = await cir.calculateWitness({ in1: asBits1, in2: asBits2 }, true);

      const expected = utils.normalize(utils.buffer2bits(utils.bigIntToLEBuffer(a * b)));
      assert.ok(witness.slice(1, 145).every((u, i) => u === expected[i]));
    });
  });
  describe("when performing binary multiplication on two random number's binary array of 104 bits and 40 bits", () => {
    it('should multiply them correctly', async () => {
      const cir = await wasmTester(path.join(__dirname, 'circuits', 'binmul1.circom'));
      await fc.assert(
        fc.asyncProperty(
          fc.bigInt(2n, BigInt(2 ** 104) - 1n),
          fc.bigInt(2n, BigInt(2 ** 40) - 1n),
          async (a, b) => {
            const buf1 = utils.bigIntToLEBuffer(a);
            const asBits1 = utils.pad(utils.buffer2bits(buf1), 104).slice(0, 104);
            const buf2 = utils.bigIntToLEBuffer(b);
            const asBits2 = utils.pad(utils.buffer2bits(buf2), 40).slice(0, 40);
            const witness = await cir.calculateWitness({ in1: asBits1, in2: asBits2 }, true);

            const expected = utils.pad(utils.buffer2bits(utils.bigIntToLEBuffer(a * b)), 144);
            return witness.slice(1, 145).every((u, i) => u === expected[i]);
          },
        ),
      );
    });
  });
});

describe('Fast Binary Multiplier Test', () => {
  describe('when performing binary multiplication on 104 bit and an 40 bit numbers', () => {
    it('should multiply them correctly', async () => {
      const cir = await wasmTester(path.join(__dirname, 'circuits', 'binmulfast1.circom'));
      const a = BigInt('2820282019728792003956564819949');
      const b = BigInt('956564819949');
      const buf1 = utils.bigIntToLEBuffer(a);
      const asBits1 = utils.buffer2bits(buf1);
      const buf2 = utils.bigIntToLEBuffer(b);
      const asBits2 = utils.buffer2bits(buf2);
      const witness = await cir.calculateWitness({ in1: asBits1, in2: asBits2 }, true);

      const expected = utils.normalize(utils.buffer2bits(utils.bigIntToLEBuffer(a * b)));
      assert.ok(witness.slice(1, 145).every((u, i) => u === expected[i]));
    });
  });
});

describe(' Fast Binary multiplication chunked 51 test', () => {
  describe('When Performing binary multiplication on 4 by 4 numbers chunked by 51 bits', () => {
    it('should multiply them correctly', async () => {
      const cir = await wasmTester(path.join(__dirname, 'circuits', 'binmulfast51_1.circom'));
      const a = BigInt(2 ** 200 - 10);
      const b = BigInt(2 ** 203 - 10);
      const chunk1 = utils.chunkBigInt(a);
      const chunk2 = utils.chunkBigInt(b);
      const witness = await cir.calculateWitness({ in1: chunk1, in2: chunk2 });
      const expected = utils.chunkBigInt(a * b);
      assert.ok(witness.slice(1, 9).every((u, i) => u === expected[i]));
    });
  });

  describe('When performing binary multiplication on 4 chunks of two randomly genrated  numbers chunked with base51', () => {
    it('should multiply them correctly', async () => {
      const cir = await wasmTester(path.join(__dirname, 'circuits', 'binmulfast51_1.circom'));
      await fc.assert(
        fc.asyncProperty(
          fc.bigInt(2n, BigInt(2 ** 200) - 10n),
          fc.bigInt(2n, BigInt(2 ** 203) - 10n),
          async (a, b) => {
            const chunk1 = utils.pad(utils.chunkBigInt(a), 4);
            const chunk2 = utils.pad(utils.chunkBigInt(b), 4);
            const witness = await cir.calculateWitness({ in1: chunk1, in2: chunk2 });
            const expected = utils.pad(utils.chunkBigInt(a * b), 8);
            return witness.slice(1, 9).every((u, i) => u === expected[i]);
          },
        ),
      );
    });
  });

  describe('When Performing binary multiplication on 4 by 1 numbers chunked by 51 bits', () => {
    it('should multiply them correctly', async () => {
      const cir = await wasmTester(path.join(__dirname, 'circuits', 'binmulfast51_2.circom'));
      const a = BigInt(2 ** 200 - 10);
      const b = BigInt(19);
      const chunk1 = utils.chunkBigInt(a);
      const chunk2 = utils.chunkBigInt(b);
      const witness = await cir.calculateWitness({ in1: chunk1, in2: chunk2 });
      const expected = utils.chunkBigInt(a * b);
      assert.ok(witness.slice(1, 6).every((u, i) => u === expected[i]));
    });
  });
});

describe('Check bits less then 51', () => {
  describe('when a number is passed into it of 49 bits', () => {
    it('should give output of 1', async () => {
      const cir = await wasmTester(path.join(__dirname, 'circuits', 'binmullessthan51.circom'));
      const witness = await cir.calculateWitness({ in: BigInt('450359962737049') });

      assert.ok(witness[1] === 1n);
    });
  });

  describe('when a number is passed into it of 52 bits', () => {
    it('should give output of 0', async () => {
      const cir = await wasmTester(path.join(__dirname, 'circuits', 'binmullessthan51.circom'));
      const witness = await cir.calculateWitness({ in: BigInt('4503599627370490') });
      assert.ok(witness[1] === 0n);
    });
  });

  describe('when a number is passed into it of greater than 52 bits', () => {
    it('should fail on witness calculation', async () => {
      const cir = await wasmTester(path.join(__dirname, 'circuits', 'binmullessthan51.circom'));
      const witness = await cir.calculateWitness({ in: BigInt('45035996273704904503599627370490') });
      assert.ok(witness[1] === 0n);
    });
  });
});
