const path = require('path');
const assert = require('assert');
const wasmTester = require('circom_tester').wasm;
const fc = require('fast-check');
const utils = require('./utils');

describe('Point compress test for base51', () => {
  describe('when performing point compress on a point', () => {
    it('should compresss them correctly', async () => {
      const cir = await wasmTester(path.join(__dirname, 'circuits', 'pointcompress.circom'));
      const P = [
        15112221349535400772501151409588531511454012693041857206046113283949847762202n,
        46316835694926478169428394003475163141307993866256225615783033603165251855960n,
        1n,
        46827403850823179245072216630277197565144205554125654976674165829533817101731n,
      ];
      const chunk = [];
      for (let i = 0; i < 4; i++) {
        chunk.push(utils.chunkBigInt(P[i], BigInt(2 ** 85)));
      }
      for (let i = 0; i < 4; i++) {
        utils.pad(chunk[i], 3);
      }
      const witness = await cir.calculateWitness({ P: chunk }, true);
      const res = utils.point_compress(P);
      assert.ok(witness.slice(1, 257).every((u, i) => u === res[i]));
    });
  });
  describe('when performing point compress on a point', () => {
    it('should calculate the compress correctly', async () => {
      const cir = await wasmTester(path.join(__dirname, 'circuits', 'pointcompress.circom'));
      await fc.assert(
        fc.asyncProperty(
          fc.bigInt(2n, BigInt(2 ** 254) - 2000n),
          fc.bigInt(2n, BigInt(2 ** 254) - 2025n),
          fc.bigInt(1n, BigInt(2 ** 254) - 2203n),
          fc.bigInt(3n, BigInt(2 ** 254) - 2403n),
          async (a, b, c, d) => {
            const chunk = [];
            chunk.push(utils.pad(utils.chunkBigInt(a, BigInt(2 ** 85)), 3));
            chunk.push(utils.pad(utils.chunkBigInt(b, BigInt(2 ** 85)), 3));
            chunk.push(utils.pad(utils.chunkBigInt(c, BigInt(2 ** 85)), 3));
            chunk.push(utils.pad(utils.chunkBigInt(d, BigInt(2 ** 85)), 3));
            const witness = await cir.calculateWitness({ P: chunk }, true);
            const P = [a, b, c, d];
            const res = utils.pad(utils.point_compress(P), 256);
            return witness.slice(1, 257).every((u, i) => u === res[i]);
          },
        ),
      );
    });
  });
});
