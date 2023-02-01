const path = require('path');
const assert = require('assert');
const wasmTester = require('circom_tester').wasm;
const utils = require('./utils');

describe('Scalar multiplication for ed25519', () => {
  describe('when performing scalar multiplication on curve ', () => {
    it('should multiply them correctly', async () => {
      const cir = await wasmTester(path.join(__dirname, 'circuits', 'scalarmul.circom'));
      const p = BigInt(2 ** 255) - BigInt(19);
      const s = 4869643893319708471955165214975585939793846505679808910535986866633137979160n;
      const P = [
        15112221349535400772501151409588531511454012693041857206046113283949847762202n,
        46316835694926478169428394003475163141307993866256225615783033603165251855960n,
        1n,
        46827403850823179245072216630277197565144205554125654976674165829533817101731n,
      ];
      const buf = utils.bigIntToLEBuffer(s);
      const asBits = utils.pad(utils.buffer2bits(buf), 255);
      asBits.pop();
      const chunkP = [];
      for (let i = 0; i < 4; i++) {
        chunkP.push(utils.chunkBigInt(P[i], BigInt(2 ** 85)));
      }
      for (let i = 0; i < 4; i++) {
        utils.pad(chunkP[i], 3);
      }
      const witness = await cir.calculateWitness({ s: asBits, P: chunkP });
      const res = utils.point_mul(s, P);
      for (let i = 0; i < 4; i++) {
        res[i] = utils.modulus(res[i], p);
      }
      const wt = witness.slice(1, 13);
      const chunk = [];
      for (let i = 0; i < 4; i++) {
        chunk.push(wt.slice(3 * i, 3 * i + 3));
      }

      const dechunkedWt = [];
      for (let i = 0; i < 4; i++) {
        dechunkedWt.push(utils.dechunk(chunk[i], BigInt(2 ** 85)));
      }
      assert.ok(
        utils.point_equal(res, dechunkedWt),
      );
    });
  });
});
