import { POD, PODContent, decodePublicKey, decodeSignature } from "@pcd/pod";
import { BABY_JUB_NEGATIVE_ONE } from "@pcd/util";
import { expect } from "chai";
import { WitnessTester } from "circomkit";
import "mocha";
import path from "path";
import { poseidon2 } from "poseidon-lite/poseidon2";
import {
  CircuitArtifactPaths,
  PROTO_POD_GPC_PUBLIC_INPUT_NAMES,
  ProtoPODGPC,
  ProtoPODGPCInputNamesType,
  ProtoPODGPCInputs,
  ProtoPODGPCOutputNamesType,
  ProtoPODGPCOutputs,
  ProtoPODGPCCircuitParams,
  protoPODGPCCircuitParamArray,
  array2Bits,
  extendedSignalArray,
  gpcArtifactPaths
} from "../src";
import {
  circomkit,
  ownerIdentity,
  privateKey,
  sampleEntries,
  sampleEntries2
} from "./common";
import isEqual from "lodash";

const MAX_OBJECTS = 3;
const MAX_ENTRIES = 10;
const MERKLE_MAX_DEPTH = 8;

const GPC_PARAMS = ProtoPODGPCCircuitParams(
  MAX_OBJECTS,
  MAX_ENTRIES,
  MERKLE_MAX_DEPTH
);

/**
 * This is a hard-coded version of the values produced by makeTestSignals
 * with the parameters above, and isNullifierHashRevealed=true.  It is
 * included as a compatibility check, to ensure any code changes still produce
 * the same cryptographic output and can consume the output of older code.
 *
 * There are separate tests below which ensure the ability to consume this
 * sample input, as well as to ensure that newly generated input is the same as
 * this sample input.
 * - If you see a failure to consume this input, indicates an incompatible
 * change.  Think hard about whether that's intended, and update the
 * constants only if it is.
 * - If you see a failure indicating newly-generated input differs from this
 * sample, it's more likely that it's because the sample entries have changed.
 * If that's the case, then you can simply update these values based on
 * the comparison values you see in the tests.  Just be sure to think about
 * whether there's a potential incompatibility before doing so.
 */
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

/**
 * Sample of output produced by a proof with the sample inputs above.
 */
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

/**
 * Creates a set of test inputs and outputs for a circuit which the given
 * size parameters.  The input data is based on a max of 2 PODs defined
 * by the `sampleEntries` and `sampleEntries2` variables, with specific entries
 * and proof configuration based on the `testEntries` variable below.  The
 * result should lead to a valid proof for any circuit size.  If the
 * circuit is smaller than `testEntries` the config will be truncated to
 * prove about fewer entries.  If the circuit is larger than `testEntries`,
 * inputs will be padded appropriately.
 */
function makeTestSignals(
  params: ProtoPODGPCParameters,
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
  if (params.maxObjects > 1) {
    testEntries.push({ name: "attendee", objectIndex: 1, eqEntryIndex: 1 });
    testEntries.push({
      name: "eventID",
      objectIndex: 1,
      eqEntryIndex: undefined
    });
  }
  const sigOwnerEntryIndex = 1n;
  const hasOwner = params.maxEntries > sigOwnerEntryIndex;

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
  for (let objectIndex = 0; objectIndex < params.maxObjects; objectIndex++) {
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
  for (let entryIndex = 0; entryIndex < params.maxEntries; entryIndex++) {
    // Unused entries get filled in with the same info as entry 0.
    const isEntryEnabled = entryIndex < testEntries.length;
    const entryInfo = isEntryEnabled ? testEntries[entryIndex] : testEntries[0];

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
      entryInfo.eqEntryIndex < params.maxEntries
    ) {
      sigEntryEqualToOtherEntryByIndex.push(BigInt(entryInfo.eqEntryIndex));
    } else {
      sigEntryEqualToOtherEntryByIndex.push(BigInt(entryIndex));
    }
    sigEntryProofDepth.push(BigInt(entrySignals.proof.siblings.length));
    sigEntryProofIndex.push(BigInt(entrySignals.proof.index));

    // Fillin sibling array, padded with 0s to max length.
    sigEntryProofSiblings.push(
      extendedSignalArray(entrySignals.proof.siblings, params.merkleMaxDepth)
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
      entryIsValueEnabled: array2Bits(sigEntryIsValueEnabled),
      entryIsValueHashRevealed: array2Bits(sigEntryIsValueHashRevealed),
      entryEqualToOtherEntryByIndex: sigEntryEqualToOtherEntryByIndex,
      entryProofDepth: sigEntryProofDepth,
      entryProofIndex: sigEntryProofIndex,
      entryProofSiblings: sigEntryProofSiblings,
      ownerEntryIndex: hasOwner ? sigOwnerEntryIndex : BABY_JUB_NEGATIVE_ONE,
      ownerSemaphoreV3IdentityNullifier: hasOwner
        ? ownerIdentity.nullifier
        : BABY_JUB_NEGATIVE_ONE,
      ownerSemaphoreV3IdentityTrapdoor: hasOwner
        ? ownerIdentity.trapdoor
        : BABY_JUB_NEGATIVE_ONE,
      ownerExternalNullifier: 42n,
      ownerIsNullfierHashRevealed: isNullifierHashRevealed ? 1n : 0n,
      globalWatermark: 1337n
    },
    outputs: {
      entryRevealedValueHash: sigEntryRevealedValueHash,
      ownerRevealedNulifierHash:
        isNullifierHashRevealed && params.maxEntries > sigOwnerEntryIndex
          ? poseidon2([42n, ownerIdentity.nullifier])
          : BABY_JUB_NEGATIVE_ONE
    }
  };
}

describe("proto-pod-gpc.ProtoPODGPC (WitnessTester) should work", function () {
  let circuit: WitnessTester<
    ProtoPODGPCInputNamesType,
    ProtoPODGPCOutputNamesType
  >;

  this.beforeAll(async () => {
    circuit = await circomkit.WitnessTester("ProtoPODGPC", {
      file: "proto-pod-gpc",
      template: "ProtoPODGPC",
      params: protoPODGPCCircuitParamArray(GPC_PARAMS),
      pubs: PROTO_POD_GPC_PUBLIC_INPUT_NAMES
    });
  });

  it("should accept a sample input", async () => {
    await circuit.expectPass(sampleInput, sampleOutput);
  });

  it("should accept dynamic input", async () => {
    let { inputs, outputs } = makeTestSignals(
      GPC_PARAMS,
      true /*isNullifierHashRevealed*/
    );
    expect(inputs).to.deep.eq(sampleInput);
    expect(outputs).to.deep.eq(sampleOutput);
    await circuit.expectPass(inputs, outputs);

    ({ inputs, outputs } = makeTestSignals(
      GPC_PARAMS,
      false /*isNullifierHashRevealed*/
    ));
    await circuit.expectPass(inputs, outputs);
  });

  it("should accept with different parameters", async () => {
    // { maxObjects: 3, maxEntries: 10, merkleMaxDepth: 8 } is the default
    // above, and is larger than the test data in all dimensions (so padding
    // is exercised).  What we're testing here is the ability to handle
    // smaller sizes, with truncated data as necessary.
    for (const params of ProtoPODGPC.CIRCUIT_PARAMETERS.map(
      (pair) => pair[0]
    )) {
      const { inputs, outputs } = makeTestSignals(
        params,
        true /*isNullifierHashRevealed*/
      );
      const altCircuit = await circomkit.WitnessTester("ProtoPODGPC", {
        file: "proto-pod-gpc",
        template: "ProtoPODGPC",
        params: protoPODGPCCircuitParamArray(params)
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

describe("proto-pod-gpc.ProtoPODGPC (Precompiled Artifacts) should work", function () {
  function prepGroth16Test(params: ProtoPODGPCParameters): {
    artifacts: CircuitArtifactPaths;
    vkey: object;
  } {
    const circuitDesc = ProtoPODGPC.pickCircuit(params);
    expect(circuitDesc).to.not.be.undefined;
    if (!circuitDesc) {
      throw new Error("Missing circuit desc!");
    }

    const artifacts = gpcArtifactPaths(
      path.join(__dirname, "../artifacts/test"),
      circuitDesc
    );
    expect(artifacts.wasmPath).to.not.be.empty;
    expect(artifacts.pkeyPath).to.not.be.empty;
    expect(artifacts.vkeyPath).to.not.be.empty;

    return artifacts;
  }

  async function groth16Test(
    artifacts: CircuitArtifactPaths,
    inputs: ProtoPODGPCInputs,
    expectedOutputs: ProtoPODGPCOutputs
  ): Promise<void> {
    const { proof, outputs, publicSignals } = await ProtoPODGPC.prove(
      inputs,
      artifacts.wasmPath,
      artifacts.pkeyPath
    );
    expect(outputs).to.deep.eq(expectedOutputs);

    // Double-check that full set of expected public signals matches.
    const expectedPublicSignals = ProtoPODGPC.makePublicSignals(
      ProtoPODGPC.filterPublicInputs(inputs),
      outputs
    ).map(BigInt);
    expect(publicSignals).to.deep.eq(expectedPublicSignals);

    const verified = await ProtoPODGPC.verify(
      artifacts.vkeyPath,
      proof,
      ProtoPODGPC.filterPublicInputs(inputs),
      outputs
    );
    expect(verified).to.be.true;
  }

  it("should accept a sample input", async () => {
    const { artifacts, vkey } = prepGroth16Test(GPC_PARAMS);
    await groth16Test(artifacts, vkey, sampleInput, sampleOutput);
  });

  it("should accept dynamic input", async () => {
    const { artifacts, _vkey } = prepGroth16Test(GPC_PARAMS);

    let { inputs, outputs } = makeTestSignals(
      GPC_PARAMS,
      true /*isNullifierHashRevealed*/
    );
    expect(inputs).to.deep.eq(sampleInput);
    expect(outputs).to.deep.eq(sampleOutput);
    await groth16Test(artifacts, inputs, outputs);

    ({ inputs, outputs } = makeTestSignals(
      GPC_PARAMS,
      false /*isNullifierHashRevealed*/
    ));
    await groth16Test(artifacts, inputs, outputs);
  });

  it("should accept with each circuit in family", async () => {
    // { maxObjects: 3, maxEntries: 10, merkleMaxDepth: 8 } is the default
    // above, and is larger than the test data in all dimensions (so padding
    // is exercised).  What we're testing here is the ability to handle
    // smaller sizes, with truncated data as necessary.
    for (const cd of ProtoPODGPC.CIRCUIT_PARAMETERS.map((pair) => pair[0])) {
      // Skip the default (largest) config, already tested above.
      if (isEqual(cd, GPC_PARAMS)) {
        continue;
      }

      const { artifacts, _vkey } = prepGroth16Test(cd);
      const { inputs, outputs } = makeTestSignals(
        cd,
        true /*isNullifierHashRevealed*/
      );
      await groth16Test(artifacts, inputs, outputs);
    }
  });
});

// TODO(POD-P1): utests of statics and helpers in proto-pod-gpc.ts
