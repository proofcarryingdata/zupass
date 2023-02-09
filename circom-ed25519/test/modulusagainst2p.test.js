const path = require('path');
const assert = require('assert');
const bigintModArith = require('bigint-mod-arith');
const wasmTester = require('circom_tester').wasm;
const utils = require('./utils');
// const { performance } = require('perf_hooks');

describe('Modulus Test against 2P', () => {
  const arr = [
    57896044618658097711785492504343953926634992332820282019728792003956564818925n,
    57896044618658096104847448245353678384672899991657679497525798221163729518573n,
    57896044618658097711785492504342526678942286372939223733759342508820182073325n,
    57896044618658097711783960008803088037776633985793131710545173264834381217773n,
    57896044618658097711785492504343953926634992332800474979100225919558178832365n,
    115792089237316193816632940749697632311307892324477961517254590225120294338522n,
    115792089237263539277736706415338948839428149449481116491757309452285974151130n,
    115792087511879608725930038149998942284013621552863320996860945217282073690074n,
    115791978809374646774550386052594111420862745447897009313272701407525548851162n,
    115790322390251417039241401711187164934754157181743688420499462401711837020122n,
  ];

  for (let iter = 0; iter < arr.length; iter++) {
    const num = arr[iter];
    describe(`when perforrming modulo p against a number ${num} less than 2p`, () => {
      const p = BigInt('57896044618658097711785492504343953926634992332820282019728792003956564819949');

      it('should ouput the correct value, less than p', async () => {
        const cir = await wasmTester(path.join(__dirname, 'circuits', 'modulusagainst2p.circom'));

        const chunked = utils.pad(utils.chunkBigInt(num, BigInt(2 ** 85)), 4);
        const witness = await cir.calculateWitness({ in: chunked }, true);
        const expected = utils.chunkBigInt(bigintModArith.modPow(num, 1, p), BigInt(2 ** 85));
        assert.ok(witness.slice(1, 4).every((u, i) => u === expected[i]));
      });
    });
  }
});
