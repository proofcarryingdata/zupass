import { POD, PODContent, decodePublicKey, decodeSignature } from "@pcd/pod";
import { BABY_JUB_NEGATIVE_ONE } from "@pcd/util";
import { expect } from "chai";
import { WitnessTester } from "circomkit";
import "mocha";
import {
  PROTO_POD_GPC_PUBLIC_INPUT_NAMES,
  ProtoPODGPCInputNamesType,
  ProtoPODGPCInputs,
  ProtoPODGPCOutputNamesType,
  ProtoPODGPCOutputs
} from "../src";
import {
  circomkit,
  extendedSignalArray,
  ownerIdentity,
  privateKey,
  sampleEntries,
  sampleEntries2,
  testArray2Bits
} from "./common";

describe("proto-pod-gpc.ProtoPODGPC should work", function () {
  // Circuit compilation sometimes takes more than the default timeout of 2s.
  this.timeout(30_000);
  let circuit: WitnessTester<
    ProtoPODGPCInputNamesType,
    ProtoPODGPCOutputNamesType
  >;
  const MAX_OBJECTS = 3;
  const MAX_ENTRIES = 10;
  const MERKLE_MAX_DEPTH = 8;

  const sampleInput: ProtoPODGPCInputs = {
    // Object modules [MAX_OBJECTS].
    objectContentID: [
      21748523748810072846647845097417136490972606253431724953054174411568740252986n,
      8121973595251725959527136190050016648811901981184487048534858036206640503232n,
      21748523748810072846647845097417136490972606253431724953054174411568740252986n
    ],
    /*PUB*/ objectSignerPubkeyAx: [
      13277427435165878497778222415993513565335242147425444199013288855685581939618n,
      13277427435165878497778222415993513565335242147425444199013288855685581939618n,
      13277427435165878497778222415993513565335242147425444199013288855685581939618n
    ],
    /*PUB*/ objectSignerPubkeyAy: [
      13622229784656158136036771217484571176836296686641868549125388198837476602820n,
      13622229784656158136036771217484571176836296686641868549125388198837476602820n,
      13622229784656158136036771217484571176836296686641868549125388198837476602820n
    ],
    objectSignatureR8x: [
      6038506024914176555971696239631925145651921744785715063801385744277106829464n,
      17276140439707741123961012398868155888129331838354509701720066890556333534962n,
      6038506024914176555971696239631925145651921744785715063801385744277106829464n
    ],
    objectSignatureR8y: [
      5854572179632427711757099340363612268833921239023445778926307643717502239712n,
      4478813987562354901219305265765871897349665771516714286553596533146368273231n,
      5854572179632427711757099340363612268833921239023445778926307643717502239712n
    ],
    objectSignatureS: [
      2646080646960744705949380602187314965535331728145240289516670722008150701947n,
      246689540249778653713276021978600549955626166095777914633374815228939241963n,
      2646080646960744705949380602187314965535331728145240289516670722008150701947n
    ],

    // Entry modules [MAX_ENTRIES].
    /*PUB*/ entryObjectIndex: [0n, 0n, 0n, 0n, 1n, 1n, 0n, 0n, 0n, 0n],
    /*PUB*/ entryNameHash: [
      151251200029686127063327095456320040687905427497336635391695211041155747807n,
      134391921332508560099964544679493715295561887371159641958333364222734962117n,
      189299395894817028341377136440374346654807305685374867635317277536233949076n,
      300288658781160042600136958258128788307343035694769415667235118833120457708n,
      342949817308325102533753023095764481919209045044694155820648303022684782250n,
      53263882652869188233442867997794714745800659178874616674229264640580912587n,
      151251200029686127063327095456320040687905427497336635391695211041155747807n,
      151251200029686127063327095456320040687905427497336635391695211041155747807n,
      151251200029686127063327095456320040687905427497336635391695211041155747807n,
      151251200029686127063327095456320040687905427497336635391695211041155747807n
    ],
    entryValue: [
      123n,
      18711405342588116796533073928767088921854096266145046362753928030796553161041n,
      0n,
      123n,
      18711405342588116796533073928767088921854096266145046362753928030796553161041n,
      456n,
      0n,
      0n,
      0n,
      0n
    ],
    /*PUB*/ entryIsValueEnabled: 59n,
    /*PUB*/ entryIsValueHashRevealed: 21n,
    entryProofDepth: [5n, 3n, 5n, 5n, 3n, 3n, 5n, 5n, 5n, 5n],
    entryProofIndex: [0n, 6n, 4n, 8n, 0n, 2n, 0n, 0n, 0n, 0n],
    entryProofSiblings: [
      [
        9904028930859697121695025471312564917337032846528014134060777877259199866166n,
        3061484723492332507965148030160360459221544214848710312076669786481227696312n,
        1034918093316386824116250922167450510848513309806370785803679707656130099343n,
        1967460137183576823935940165748484233277693357918661365351807577356270673444n,
        7007943877879558410284399887032121565251848089920956518084084556491129737612n,
        0n,
        0n,
        0n
      ],
      [
        6111114915052368960013028357687874844561982077054171687671655940344165800007n,
        11096941554911766269591512438306543037648897778876512669092185697158334141884n,
        878417866821669669522076576747055310573348304334101916686376059972110407914n,
        0n,
        0n,
        0n,
        0n,
        0n
      ],
      [
        79413589009516425735881875984458315063673535229512653237262904385386810264n,
        2988967693189246630227921486167231126160629249388754049032915631130877132159n,
        12362374997124488476322045861640292353131125538521613863615454299982158675332n,
        1967460137183576823935940165748484233277693357918661365351807577356270673444n,
        7007943877879558410284399887032121565251848089920956518084084556491129737612n,
        0n,
        0n,
        0n
      ],
      [
        9904028930859697121695025471312564917337032846528014134060777877259199866166n,
        13668449146162081837160030987226451011104790516898257065617008244028191958016n,
        13367959075812247489073491246943547730887238023109366321601974217602143416556n,
        19447992562784698394687517181808908839437555749634616537692960194318245665263n,
        7007943877879558410284399887032121565251848089920956518084084556491129737612n,
        0n,
        0n,
        0n
      ],
      [
        6111114915052368960013028357687874844561982077054171687671655940344165800007n,
        6376514122805686556057022362450217144216155426480889124042640416146259159616n,
        2720192215416253774358021860068355957407670823856560393117054770965832043978n,
        0n,
        0n,
        0n,
        0n,
        0n
      ],
      [
        5537782408586483095179205238470693004605299677776401318528976418642660549437n,
        20773279285022515108170558039293645952057292062999881653725415257517828272020n,
        2720192215416253774358021860068355957407670823856560393117054770965832043978n,
        0n,
        0n,
        0n,
        0n,
        0n
      ],
      [
        9904028930859697121695025471312564917337032846528014134060777877259199866166n,
        3061484723492332507965148030160360459221544214848710312076669786481227696312n,
        1034918093316386824116250922167450510848513309806370785803679707656130099343n,
        1967460137183576823935940165748484233277693357918661365351807577356270673444n,
        7007943877879558410284399887032121565251848089920956518084084556491129737612n,
        0n,
        0n,
        0n
      ],
      [
        9904028930859697121695025471312564917337032846528014134060777877259199866166n,
        3061484723492332507965148030160360459221544214848710312076669786481227696312n,
        1034918093316386824116250922167450510848513309806370785803679707656130099343n,
        1967460137183576823935940165748484233277693357918661365351807577356270673444n,
        7007943877879558410284399887032121565251848089920956518084084556491129737612n,
        0n,
        0n,
        0n
      ],
      [
        9904028930859697121695025471312564917337032846528014134060777877259199866166n,
        3061484723492332507965148030160360459221544214848710312076669786481227696312n,
        1034918093316386824116250922167450510848513309806370785803679707656130099343n,
        1967460137183576823935940165748484233277693357918661365351807577356270673444n,
        7007943877879558410284399887032121565251848089920956518084084556491129737612n,
        0n,
        0n,
        0n
      ],
      [
        9904028930859697121695025471312564917337032846528014134060777877259199866166n,
        3061484723492332507965148030160360459221544214848710312076669786481227696312n,
        1034918093316386824116250922167450510848513309806370785803679707656130099343n,
        1967460137183576823935940165748484233277693357918661365351807577356270673444n,
        7007943877879558410284399887032121565251848089920956518084084556491129737612n,
        0n,
        0n,
        0n
      ]
    ],

    // Entry constraint modules.
    /*PUB*/ entryEqualToOtherEntryByIndex: [
      3n,
      1n,
      2n,
      3n,
      1n,
      5n,
      3n,
      3n,
      3n,
      3n
    ],

    // Owner module (1)
    /*PUB*/ ownerEntryIndex: 1n,
    ownerSemaphoreV3IdentityNullifier:
      99353161014976810914716773124042455250852206298527174581112949561812190422n,
    ownerSemaphoreV3IdentityTrapdoor:
      329061722381819402313027227353491409557029289040211387019699013780657641967n,
    /*PUB*/ ownerExternalNullifier: 42n,
    /*PUB*/ ownerIsNullfierHashRevealed: 1n,

    // Global module (1)
    /*PUB*/ globalWatermark: 1337n
  };

  const sampleOutput: ProtoPODGPCOutputs = {
    entryRevealedValueHash: [
      9904028930859697121695025471312564917337032846528014134060777877259199866166n,
      21888242871839275222246405745257275088548364400416034343698204186575808495616n,
      79413589009516425735881875984458315063673535229512653237262904385386810264n,
      21888242871839275222246405745257275088548364400416034343698204186575808495616n,
      6111114915052368960013028357687874844561982077054171687671655940344165800007n,
      21888242871839275222246405745257275088548364400416034343698204186575808495616n,
      21888242871839275222246405745257275088548364400416034343698204186575808495616n,
      21888242871839275222246405745257275088548364400416034343698204186575808495616n,
      21888242871839275222246405745257275088548364400416034343698204186575808495616n,
      21888242871839275222246405745257275088548364400416034343698204186575808495616n
    ],
    ownerRevealedNulifierHash:
      1517081033071132720435657432021139876572843496027662548196342287861804968602n
  };

  function makeTestSignals(
    paramMaxObjects: number,
    paramMaxEntries: number,
    paramMaxDepth: number,
    isNullifierHashRevealed: boolean
  ): { inputs: ProtoPODGPCInputs; outputs: ProtoPODGPCOutputs } {
    // Test data is selected to exercise a lot of features at once, at full
    // size.  Test data always includes a max of 2 real objects and 6 entries.
    // Depending on parameters above, some will be left out of the proof, or
    // some proof inputs will remain unused.
    const testObjects = [sampleEntries, sampleEntries2];
    const testEntries = [
      { name: "A", objectIndex: 0, eqEntryIndex: 3 },
      { name: "owner", objectIndex: 0, eqEntryIndex: undefined },
      { name: "C", objectIndex: 0, eqEntryIndex: undefined },
      { name: "E", objectIndex: 0, eqEntryIndex: undefined }
    ];
    if (paramMaxObjects > 1) {
      testEntries.push({ name: "attendee", objectIndex: 1, eqEntryIndex: 1 });
      testEntries.push({
        name: "eventID",
        objectIndex: 1,
        eqEntryIndex: undefined
      });
    }
    const sigOwnerEntryIndex = 1n;

    // Build and sign test PODs.
    const pods = [];
    const signatures = [];
    const publicKeys = [];
    for (const inputEntries of testObjects) {
      const pod = POD.sign(inputEntries, privateKey);
      const verified = pod.verifySignature();
      expect(verified).to.be.true;
      pods.push(pod);
      signatures.push(decodeSignature(pod.signature));
      publicKeys.push(decodePublicKey(pod.signerPublicKey));
    }

    // Fill in ObjectModule inputs.
    const sigObjectContentID = [];
    const sigObjectSignerPubkeyAx = [];
    const sigObjectSignerPubkeyAy = [];
    const sigObjectSignatureR8x = [];
    const sigObjectSignatureR8y = [];
    const sigObjectSignatureS = [];
    for (let objectIndex = 0; objectIndex < paramMaxObjects; objectIndex++) {
      // Unused objects get filled in with the same info as object 0.
      const isObjectEnabled = objectIndex < testObjects.length;
      const i = isObjectEnabled ? objectIndex : 0;

      sigObjectContentID.push(pods[i].contentID);
      sigObjectSignerPubkeyAx.push(publicKeys[i][0]);
      sigObjectSignerPubkeyAy.push(publicKeys[i][1]);
      sigObjectSignatureR8x.push(signatures[i].R8[0]);
      sigObjectSignatureR8y.push(signatures[i].R8[1]);
      sigObjectSignatureS.push(signatures[i].S);
    }

    // Fill in entry module inputs.
    const sigEntryObjectIndex = [];
    const sigEntryNameHash = [];
    const sigEntryValue = [];
    const sigEntryIsValueEnabled = [];
    const sigEntryIsValueHashRevealed = [];
    const sigEntryRevealedValueHash = [];
    const sigEntryEqualToOtherEntryByIndex = [];
    const sigEntryProofDepth = [];
    const sigEntryProofIndex = [];
    const sigEntryProofSiblings = [];
    for (let entryIndex = 0; entryIndex < paramMaxEntries; entryIndex++) {
      // Unused entries get filled in with the same info as entry 0.
      const isEntryEnabled = entryIndex < testEntries.length;
      const entryInfo = isEntryEnabled
        ? testEntries[entryIndex]
        : testEntries[0];

      // Generate entry Merkle membership proof.
      const entryName = entryInfo.name;
      const entryPOD = pods[entryInfo.objectIndex];
      const entrySignals =
        entryPOD.content.generateEntryCircuitSignals(entryName);
      expect(PODContent.verifyEntryProof(entrySignals.proof)).to.be.true;

      // Fill in entry's identity info.
      sigEntryObjectIndex.push(BigInt(entryInfo.objectIndex));
      sigEntryNameHash.push(entrySignals.nameHash);

      // Fill in entry value for supported types.  Value hash is arbitrarily
      // revealed for even-numbered entries.
      const isValueHashRevealed = entryIndex % 2 === 0;
      const entryValueHash = entrySignals.valueHash;
      if (!isEntryEnabled) {
        sigEntryValue.push(0n);
        sigEntryIsValueEnabled.push(0n);
        sigEntryIsValueHashRevealed.push(0n);
        sigEntryRevealedValueHash.push(BABY_JUB_NEGATIVE_ONE);
      } else {
        sigEntryValue.push(
          entrySignals.value !== undefined ? entrySignals.value : 0n
        );
        sigEntryIsValueEnabled.push(entrySignals.value !== undefined ? 1n : 0n);
        sigEntryIsValueHashRevealed.push(isValueHashRevealed ? 1n : 0n);
        sigEntryRevealedValueHash.push(
          isValueHashRevealed ? entryValueHash : BABY_JUB_NEGATIVE_ONE
        );
      }

      // Fill in entry equality rules, which is also how ownership is proven
      // for multiple objects.  An unconstrained entry is set to be equal
      // to itself.
      if (
        entryInfo.eqEntryIndex !== undefined &&
        entryInfo.eqEntryIndex < testEntries.length &&
        entryInfo.eqEntryIndex < paramMaxEntries
      ) {
        sigEntryEqualToOtherEntryByIndex.push(BigInt(entryInfo.eqEntryIndex));
      } else {
        sigEntryEqualToOtherEntryByIndex.push(BigInt(entryIndex));
      }
      sigEntryProofDepth.push(BigInt(entrySignals.proof.siblings.length));
      sigEntryProofIndex.push(BigInt(entrySignals.proof.index));

      // Fillin sibling array, padded with 0s to max length.
      sigEntryProofSiblings.push(
        extendedSignalArray(entrySignals.proof.siblings, paramMaxDepth)
      );
    }

    return {
      inputs: {
        objectContentID: sigObjectContentID,
        objectSignerPubkeyAx: sigObjectSignerPubkeyAx,
        objectSignerPubkeyAy: sigObjectSignerPubkeyAy,
        objectSignatureR8x: sigObjectSignatureR8x,
        objectSignatureR8y: sigObjectSignatureR8y,
        objectSignatureS: sigObjectSignatureS,
        entryObjectIndex: sigEntryObjectIndex,
        entryNameHash: sigEntryNameHash,
        entryValue: sigEntryValue,
        entryIsValueEnabled: testArray2Bits(sigEntryIsValueEnabled),
        entryIsValueHashRevealed: testArray2Bits(sigEntryIsValueHashRevealed),
        entryEqualToOtherEntryByIndex: sigEntryEqualToOtherEntryByIndex,
        entryProofDepth: sigEntryProofDepth,
        entryProofIndex: sigEntryProofIndex,
        entryProofSiblings: sigEntryProofSiblings,
        ownerEntryIndex:
          paramMaxEntries > sigOwnerEntryIndex
            ? sigOwnerEntryIndex
            : BABY_JUB_NEGATIVE_ONE,
        ownerSemaphoreV3IdentityNullifier: ownerIdentity.nullifier,
        ownerSemaphoreV3IdentityTrapdoor: ownerIdentity.trapdoor,
        ownerExternalNullifier: 42n,
        ownerIsNullfierHashRevealed: isNullifierHashRevealed ? 1n : 0n,
        globalWatermark: 1337n
      },
      outputs: {
        entryRevealedValueHash: sigEntryRevealedValueHash,
        ownerRevealedNulifierHash:
          isNullifierHashRevealed && paramMaxEntries > sigOwnerEntryIndex
            ? 1517081033071132720435657432021139876572843496027662548196342287861804968602n
            : BABY_JUB_NEGATIVE_ONE
      }
    };
  }

  this.beforeAll(async () => {
    circuit = await circomkit.WitnessTester("ProtoPODGPC", {
      file: "proto-pod-gpc",
      template: "ProtoPODGPC",
      params: [MAX_OBJECTS, MAX_ENTRIES, MERKLE_MAX_DEPTH],
      pubs: PROTO_POD_GPC_PUBLIC_INPUT_NAMES
    });
  });

  it("should accept a sample input", async () => {
    await circuit.expectPass(sampleInput, sampleOutput);
  });

  it("should accept dynamic input", async () => {
    let { inputs, outputs } = makeTestSignals(
      MAX_OBJECTS,
      MAX_ENTRIES,
      MERKLE_MAX_DEPTH,
      true /*isNullifierHashRevealed*/
    );
    expect(inputs).to.deep.eq(sampleInput);
    expect(outputs).to.deep.eq(sampleOutput);
    await circuit.expectPass(inputs, outputs);

    ({ inputs, outputs } = makeTestSignals(
      MAX_OBJECTS,
      MAX_ENTRIES,
      MERKLE_MAX_DEPTH,
      false /*isNullifierHashRevealed*/
    ));
    await circuit.expectPass(inputs, outputs);
  });

  it("should accept with different parameters", async () => {
    // [3, 10, 8] is the default above, and is larger than the test data in all
    // dimensions (so padding is exercised).  What we're testing here is the
    // ability to handle smaller sizes, with truncated data as necessary.
    for (const params of [
      [1, 1, 5],
      [1, 5, 6],
      [2, 10, 8]
    ]) {
      const { inputs, outputs } = makeTestSignals(
        params[0],
        params[1],
        params[2],
        true /*isNullifierHashRevealed*/
      );
      const altCircuit = await circomkit.WitnessTester("ProtoPODGPC", {
        file: "proto-pod-gpc",
        template: "ProtoPODGPC",
        params: params
      });
      await altCircuit.expectPass(inputs, outputs);
    }
  });

  // TODO(POD-P2): Add more directed tests of individual features once
  // they are more stable. Should focus on cases not already handled in
  // utests of sub-modules.  Including:
  // - Different enable/disable config of various modules.
  // - Negative testing of invalid inputs.
});
