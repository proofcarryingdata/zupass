const path = require('path');
const assert = require('assert');
const wasmTester = require('circom_tester').wasm;
const crypto = require('crypto');
const utils = require('./utils');

// describe('Batch Verification', () => {
//   describe('when testing against three test vectors with 16 bits of message', () => {
//     it('should verify correctly', async () => {
//       const cir = await wasmTester(path.join(__dirname, 'circuits', 'batchverify.circom'));
//       const pointA = [
//         [
//           43933056957747458452560886832567536073542840507013052263144963060608791330050n,
//           16962727616734173323702303146057009569815335830970791807500022961899349823996n,
//           1n,
//           47597536765056690778342994103149503974598380825968728087754575050160026478564n,
//         ], [
//           38815646466658113194383306759739515082307681141926459231621296960732224964046n,
//           11903303657706407974989296177215005343713679411332034699907763981919547054807n,
//           1n,
//           31275909032640112889229532081174740659065478602231738919115306243253221725764n,
//         ], [
//           52774231920053734232574595727734981596546427020284349182563870143297718469550n,
//           5609657767448528674903586191599477543993232845525898641911799861560072421437n,
//           1n,
//           9309742961692514850659860522489925904126645789919881184413324359838337921138n,
//         ],
//       ];
//       const pointR = [
//         [
//           26073464383897998325899031212762184271676052677226679463708862316754828477519n,
//           20246927599389923510374971105736264637524117420538179767629249587300902801762n,
//           1n,
//           7867784340861643381702890578607277776011430152424699121581244161773093676488n,
//         ], [
//           44370630452101398467924320556439323233869374150616132215183787387252341590058n,
//           38448863731492799660668882834560725606410712239157980760146247592118262650597n,
//           1n,
//           28837567775264640306185442010835055372505962142426868564781195691916034475874n,
//         ], [
//           26073464383897998325899031212762184271676052677226679463708862316754828477519n,
//           20246927599389923510374971105736264637524117420538179767629249587300902801762n,
//           1n,
//           7867784340861643381702890578607277776011430152424699121581244161773093676488n,
//         ],
//       ];
//       const A = [
//         16962727616734173323702303146057009569815335830970791807500022961899349823996n,
//         11903303657706407974989296177215005343713679411332034699907763981919547054807n,
//         5609657767448528674903586191599477543993232845525898641911799861560072421437n,
//       ];
//       const msg = [
//         33455n,
//         0n,
//         114n,
//       ];
//       const R8 = [
//         78142972218048021222160463610080218564159109753358461787358041591257467621730n,
//         38448863731492799660668882834560725606410712239157980760146247592118262650597n,
//         98791237754691324676800292061057201459844646670582272148467697006051485917330n,
//       ];
//       const S = [
//         4869643893319708471955165214975585939793846505679808910535986866633137979160n,
//         5004556735901913393272427758925840403246877222315506387332009764265656498271n,
//         22493278956989295319831480986006851106061907369804654499116800046813764104n,
//       ];
//       let bufMsg = [];
//       let bufR8 = [];
//       let bufS = [];
//       let bufA = [];
//       let bitsMsg = [];
//       let bitsR8 = [];
//       let bitsS = [];
//       let bitsA = [];
//       for (let i = 0; i < 3; i++) {
//         bufMsg.push(utils.bigIntToLEBuffer(msg[i]));
//         bufR8.push(utils.bigIntToLEBuffer(R8[i]));
//         bufS.push(utils.bigIntToLEBuffer(S[i]));
//         bufA.push(utils.bigIntToLEBuffer(A[i]));
//       }
//       for (let i = 0; i < 3; i++) {
//         bitsMsg.push(utils.pad(utils.buffer2bits(bufMsg), 16));
//         bitsR8.push(utils.pad(utils.buffer2bits(bufR8), 256));
//         bitsS.push(utils.pad(utils.buffer2bits(bufS), 255).slice(0, 255));
//         bitsA.push(utils.pad(utils.buffer2bits(bufA), 256));
//       }
//       const chunkA = [];
//       const chunkR = [];
//       for (let j = 0; j < 3; j++) {
//         let chunkATemp = [];
//         let chunkRTemp = [];
//         for (let i = 0; i < 4; i++) {
//           chunkATemp.push(utils.chunkBigInt(pointA[j][i]));
//           chunkRTemp.push(utils.chunkBigInt(pointR[j][i]));
//         }
//         for (let i = 0; i < 4; i++) {
//           utils.pad(chunkATemp[i], 5);
//           utils.pad(chunkRTemp[i], 5);
//         }
//         chunkA.push(chunkATemp);
//         chunkR.push(chunkRTemp);
//       }

//       const witness = await cir.calculateWitness({
//         msg: bitsMsg, A: bitsA, R8: bitsR8, S: bitsS, PointA: chunkA, PointR: chunkR,
//       }, true);
//       assert.ok(witness[3] === 7n);
//     });
//   });
// });
// describe("Batch Verification test", () => {
//   describe("when testing against two test vectors", () => {
//     it("should verify them correctly", async () => {
//       const cir = await wasmTester(path.join(__dirname, 'circuits', 'batchverify.circom'));
//       const pointA = [
//         [
//           43933056957747458452560886832567536073542840507013052263144963060608791330050n,
//           16962727616734173323702303146057009569815335830970791807500022961899349823996n,
//           1n,
//           47597536765056690778342994103149503974598380825968728087754575050160026478564n,
//         ], [
//           38815646466658113194383306759739515082307681141926459231621296960732224964046n,
//           11903303657706407974989296177215005343713679411332034699907763981919547054807n,
//           1n,
//           31275909032640112889229532081174740659065478602231738919115306243253221725764n,
//         ]
//       ];
//       const pointR = [
//         [
//           26073464383897998325899031212762184271676052677226679463708862316754828477519n,
//           20246927599389923510374971105736264637524117420538179767629249587300902801762n,
//           1n,
//           7867784340861643381702890578607277776011430152424699121581244161773093676488n,
//         ], [
//           44370630452101398467924320556439323233869374150616132215183787387252341590058n,
//           38448863731492799660668882834560725606410712239157980760146247592118262650597n,
//           1n,
//           28837567775264640306185442010835055372505962142426868564781195691916034475874n,
//         ]
//       ];
//       const A = [
//         16962727616734173323702303146057009569815335830970791807500022961899349823996n,
//         11903303657706407974989296177215005343713679411332034699907763981919547054807n
//       ];
//       const msg = [
//         33455n,
//         0n
//       ];
//       const R8 = [
//         78142972218048021222160463610080218564159109753358461787358041591257467621730n,
//         38448863731492799660668882834560725606410712239157980760146247592118262650597n
//       ];
//       const S = [
//         4869643893319708471955165214975585939793846505679808910535986866633137979160n,
//         5004556735901913393272427758925840403246877222315506387332009764265656498271n
//       ];
//       let bufMsg = [];
//       let bufR8 = [];
//       let bufS = [];
//       let bufA = [];
//       let bitsMsg = [];
//       let bitsR8 = [];
//       let bitsS = [];
//       let bitsA = [];
//       for (let i = 0; i < 2; i++) {
//         bufMsg.push(utils.bigIntToLEBuffer(msg[i]));
//         bufR8.push(utils.bigIntToLEBuffer(R8[i]));
//         bufS.push(utils.bigIntToLEBuffer(S[i]));
//         bufA.push(utils.bigIntToLEBuffer(A[i]));
//       }
//       for (let i = 0; i < 2; i++) {
//         bitsMsg.push(utils.pad(utils.buffer2bits(bufMsg), 16));
//         bitsR8.push(utils.pad(utils.buffer2bits(bufR8), 256));
//         bitsS.push(utils.pad(utils.buffer2bits(bufS), 255).slice(0, 255));
//         bitsA.push(utils.pad(utils.buffer2bits(bufA), 256));
//       }
//       const chunkA = [];
//       const chunkR = [];
//       for (let j = 0; j < 2; j++) {
//         let chunkATemp = [];
//         let chunkRTemp = [];
//         for (let i = 0; i < 4; i++) {
//           chunkATemp.push(utils.chunkBigInt(pointA[j][i]));
//           chunkRTemp.push(utils.chunkBigInt(pointR[j][i]));
//         }
//         for (let i = 0; i < 4; i++) {
//           utils.pad(chunkATemp[i], 5);
//           utils.pad(chunkRTemp[i], 5);
//         }
//         chunkA.push(chunkATemp);
//         chunkR.push(chunkRTemp);
//       }
//       const witness = await cir.calculateWitness({
//         msg: bitsMsg, A: bitsA, R8: bitsR8, S: bitsS, PointA: chunkA, PointR: chunkR,
//       }, true);

//       assert.ok(witness[3] === 3n);
//     });
//   });
// });
describe('Batch Verification test', () => {
  describe('when testing against one test vectors with 16 bits of message', () => {
    it('should verify correctly', async () => {
      const cir = await wasmTester(path.join(__dirname, 'circuits', 'batchverify.circom'));
      const pointA = [
        43933056957747458452560886832567536073542840507013052263144963060608791330050n,
        16962727616734173323702303146057009569815335830970791807500022961899349823996n,
        1n,
        47597536765056690778342994103149503974598380825968728087754575050160026478564n,
      ];
      const pointR = [
        26073464383897998325899031212762184271676052677226679463708862316754828477519n,
        20246927599389923510374971105736264637524117420538179767629249587300902801762n,
        1n,
        7867784340861643381702890578607277776011430152424699121581244161773093676488n,
      ];
      const A = 16962727616734173323702303146057009569815335830970791807500022961899349823996n;
      const msg = 33455n;
      const R8 = 78142972218048021222160463610080218564159109753358461787358041591257467621730n;
      const S = 4869643893319708471955165214975585939793846505679808910535986866633137979160n;
      const bufMsg = utils.bigIntToLEBuffer(msg);
      const bufR8 = utils.bigIntToLEBuffer(R8);
      const bufS = utils.bigIntToLEBuffer(S);
      const bufA = utils.bigIntToLEBuffer(A);
      const bitsMsg = utils.buffer2bits(bufMsg);
      const bitsR8 = utils.pad(utils.buffer2bits(bufR8), 256);
      const bitsS = utils.pad(utils.buffer2bits(bufS), 255).slice(0, 255);
      const bitsA = utils.pad(utils.buffer2bits(bufA), 256);
      const chunkA = [];
      const chunkR = [];

      for (let i = 0; i < 4; i++) {
        chunkA.push(utils.chunkBigInt(pointA[i], BigInt(2 ** 85)));
        chunkR.push(utils.chunkBigInt(pointR[i], BigInt(2 ** 85)));
      }

      for (let i = 0; i < 4; i++) {
        utils.pad(chunkA[i], 3);
        utils.pad(chunkR[i], 3);
      }

      const witness = await cir.calculateWitness({
        msg: bitsMsg, A: bitsA, R8: bitsR8, S: bitsS, PointA: chunkA, PointR: chunkR,
      }, true);
      assert.ok(witness[3] === 1n);
      const expected = crypto.createHash('sha256')
        .update(utils.bigIntToLEBuffer(A))
        .digest('hex');
      const h = BigInt(2 ** 128);
      const real = utils.bigIntToLEBuffer(BigInt(witness[1] + witness[2] * h)).toString('hex');
      assert.equal(expected, real);
    });
  });
});
