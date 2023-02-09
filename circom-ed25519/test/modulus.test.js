const path = require('path');
const assert = require('assert');
const bigintModArith = require('bigint-mod-arith');
const wasmTester = require('circom_tester').wasm;
const utils = require('./utils');
// const { performance } = require('perf_hooks');

describe('Modulus Test', () => {
  describe('when performing modulus on a number in prime field 25519 ', () => {
    const p = BigInt('57896044618658097711785492504343953926634992332820282019728792003956564819949');

    it('should calculate the modulus correctly', async () => {
      const cir = await wasmTester(path.join(__dirname, 'circuits', 'modulus0.circom'));
      const a = BigInt('107896044618658097711785492504343953926634992332820282019728792003956564819949');
      const buf = utils.bigIntToLEBuffer(a);
      const asBits = utils.buffer2bits(buf);
      const witness = await cir.calculateWitness({ in: asBits }, true);

      const expected = utils.pad(
        utils.buffer2bits(utils.bigIntToLEBuffer(bigintModArith.modPow(a, 1, p))),
        255,
      );
      assert.ok(witness.slice(1, 256).every((u, i) => u === expected[i]));
    });
  });

  describe('when performing modulus on a number in prime field 25519 ', () => {
    const p = BigInt('57896044618658097711785492504343953926634992332820282019728792003956564819949');

    it('should calculate the modulus correctly', async () => {
      const cir = await wasmTester(path.join(__dirname, 'circuits', 'modulus0.circom'));
      const a = BigInt('3953926634992332820282019728792003956564819949');
      const buf = utils.bigIntToLEBuffer(a);
      const asBits = utils.pad(utils.buffer2bits(buf), 256);
      const witness = await cir.calculateWitness({ in: asBits }, true);

      const expected = utils.pad(
        utils.buffer2bits(utils.bigIntToLEBuffer(bigintModArith.modPow(a, 1, p))),
        255,
      );
      assert.ok(witness.slice(1, 256).every((u, i) => u === expected[i]));
    });
  });

  describe('when performing modulus  on a binary number of 240 bits in prime field of prime 25519', () => {
    const p = BigInt('57896044618658097711785492504343953926634992332820282019728792003956564819949');

    it('should calculate the modulus of the binary number correctly', async () => {
      const cir = await wasmTester(path.join(__dirname, 'circuits', 'modulus1.circom'));
      const a = BigInt('44618658097711785492504343953926634992332820282019728792003956564819949');
      const buf = utils.bigIntToLEBuffer(a);
      const asBits = utils.buffer2bits(buf);
      const witness = await cir.calculateWitness({ in: asBits }, true);

      const expected = utils.pad(
        utils.buffer2bits(utils.bigIntToLEBuffer(bigintModArith.modPow(a, 1, p))),
        255,
      );
      assert.ok(witness.slice(1, 256).every((u, i) => u === expected[i]));
    });
  });

  describe('when performing modulus  on a binary number of 264 bits in prime field of prime 25519', () => {
    const p = BigInt('57896044618658097711785492504343953926634992332820282019728792003956564819949');

    it('should calculate the modulus of the binary number correctly', async () => {
      const cir = await wasmTester(path.join(__dirname, 'circuits', 'modulus2.circom'));
      const a = BigInt('1257896044618658097711785492504343953926634992332820282019728792003956564819949');
      const buf = utils.bigIntToLEBuffer(a);
      const asBits = utils.buffer2bits(buf);
      // var startTime = performance.now();
      const witness = await cir.calculateWitness({ in: asBits }, true);
      // var endTime = performance.now();
      // console.log(`Call to calculate witness took ${endTime - startTime} milliseconds`);

      const expected = utils.pad(
        utils.buffer2bits(utils.bigIntToLEBuffer(bigintModArith.modPow(a, 1, p))),
        264,
      );
      assert.ok(witness.slice(1, 256).every((u, i) => u === expected[i]));
    });
  });

  describe('when performing modulus  on a binary number of 240 bits in prime field of prime 252c', () => {
    const q = BigInt('7237005577332262213973186563042994240857116359379907606001950938285454250989');

    it('should calculate the modulus of the binary number correctly', async () => {
      const cir = await wasmTester(path.join(__dirname, 'circuits', 'modulusq1.circom'));
      const a = BigInt('44618658097711785492504343953926634992332820282019728792003956564819949');
      const buf = utils.bigIntToLEBuffer(a);
      const asBits = utils.buffer2bits(buf);
      const witness = await cir.calculateWitness({ in: asBits }, true);

      const expected = utils.pad(
        utils.buffer2bits(utils.bigIntToLEBuffer(bigintModArith.modPow(a, 1, q))),
        253,
      );
      assert.ok(witness.slice(1, 254).every((u, i) => u === expected[i]));
    });
  });

  describe('when performing modulus  on a binary number of 264 bits in prime field of prime 252c', () => {
    const q = BigInt('7237005577332262213973186563042994240857116359379907606001950938285454250989');

    it('should calculate the modulus of the binary number correctly', async () => {
      const cir = await wasmTester(path.join(__dirname, 'circuits', 'modulusq2.circom'));
      const a = BigInt('1257896044618658097711785492504343953926634992332820282019728792003956564819949');
      const buf = utils.bigIntToLEBuffer(a);
      const asBits = utils.buffer2bits(buf);
      // var startTime = performance.now();
      const witness = await cir.calculateWitness({ in: asBits }, true);
      // var endTime = performance.now();
      // console.log(`Call to calculate witness took ${endTime - startTime} milliseconds`);

      const expected = utils.pad(
        utils.buffer2bits(utils.bigIntToLEBuffer(bigintModArith.modPow(a, 1, q))),
        253,
      );

      assert.ok(witness.slice(1, 254).every((u, i) => u === expected[i]));
    });
  });

  describe('when performing modulus on a number of 32 chunks each chunk of size 51 bits in  prime field of prime 25519', () => {
    it('should calculate the modulus of that number correctly', async () => {
      const cir = await wasmTester(path.join(__dirname, 'circuits', 'chunkedmodulus.circom'));
      const chunk = [
        38685626227668133590597631n,
        38685626227668133590597631n,
        38685626227668133590597631n,
        38685626227668133590597631n,
        38685626227668133590597631n,
        38685626227668133590597631n,
        38685626227668133590597631n,
        38685626227668133590597631n,
        38685626227668133590597631n,
        38685626227668133590597631n,
        38685626227668133590597631n,
        38685626227668133590597631n,
        38685626227668133590597631n,
        38685626227668133590597631n,
        38685626227668133590597631n,
        38685626227668133590597631n,
        38685626227668133590597631n,
        38685626227668133590597631n,
        38685626227668133590597631n,
        131071n];
      const witness = await cir.calculateWitness({ in: chunk }, true);
      const expected = [38685626227668133590597631n, 6166397714431n, 0n];
      assert.ok(witness.slice(1, 4).every((u, i) => u === expected[i]));
    });
  });
});
