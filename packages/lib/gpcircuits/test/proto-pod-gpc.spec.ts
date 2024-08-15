import {
  POD,
  PODContent,
  PODEntries,
  PODValue,
  decodePublicKey,
  decodeSignature
} from "@pcd/pod";
import { BABY_JUB_NEGATIVE_ONE } from "@pcd/util";
import { expect } from "chai";
import { WitnessTester } from "circomkit";
import _ from "lodash";
import "mocha";
import path from "path";
import { poseidon2 } from "poseidon-lite";
import {
  CircuitArtifactPaths,
  CircuitSignal,
  PROTO_POD_GPC_PUBLIC_INPUT_NAMES,
  ProtoPODGPC,
  ProtoPODGPCCircuitParams,
  ProtoPODGPCInputNamesType,
  ProtoPODGPCInputs,
  ProtoPODGPCOutputNamesType,
  ProtoPODGPCOutputs,
  array2Bits,
  extendedSignalArray,
  gpcArtifactPaths,
  maxTupleArity,
  padArray,
  paramMaxVirtualEntries,
  processLists,
  protoPODGPCCircuitParamArray,
  zipLists
} from "../src";
import {
  circomkit,
  ownerIdentity,
  ownerIdentityV4,
  privateKey,
  privateKey2,
  sampleEntries,
  sampleEntries2,
  sampleEntries3
} from "./common";

const MAX_OBJECTS = 3;
const MAX_ENTRIES = 10;
const MERKLE_MAX_DEPTH = 8;
const MAX_NUMERIC_VALUES = 4;
const MAX_LISTS = 2;
const MAX_LIST_ENTRIES = 20;
const MAX_TUPLES = 1;
const TUPLE_ARITY = 4;
const INCLUDE_OWNERV3 = true;
const INCLUDE_OWNERV4 = true;

const GPC_PARAMS = ProtoPODGPCCircuitParams(
  MAX_OBJECTS,
  MAX_ENTRIES,
  MERKLE_MAX_DEPTH,
  MAX_NUMERIC_VALUES,
  MAX_LISTS,
  MAX_LIST_ENTRIES,
  MAX_TUPLES,
  TUPLE_ARITY,
  INCLUDE_OWNERV3,
  INCLUDE_OWNERV4
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
    12270358673359082965738807859874919382499710065761285952062666579568565718653n,
    18485219261920225334980553941142386419465309066344414743860287563916451539637n,
    7241399912406653345145199031026192741611253920005831193761254409841914732511n
  ],
  /*PUB*/ objectSignerPubkeyAx: [
    13277427435165878497778222415993513565335242147425444199013288855685581939618n,
    12512819142096328672745574748268841190683864664801826114110182444939815508133n,
    13277427435165878497778222415993513565335242147425444199013288855685581939618n
  ],
  /*PUB*/ objectSignerPubkeyAy: [
    13622229784656158136036771217484571176836296686641868549125388198837476602820n,
    13076926918448785155412042385132024413480177434239776354704095450497712564228n,
    13622229784656158136036771217484571176836296686641868549125388198837476602820n
  ],
  objectSignatureR8x: [
    7992821217327622955890465279229121725074281617714658027486909914621548371074n,
    12917697647737660037968891386003485907424346856851728146060963416647764311563n,
    21607490226449556615222137439381990161964542438510697013272923143657527113613n
  ],
  objectSignatureR8y: [
    11405734751649171564583675673630564127815711985187113530077637798277417877047n,
    7738986716904691927169287478392174278377770853335179083699861759935197872715n,
    20850812847494270741970629349159543682278395563270616657824578700599271658986n
  ],
  objectSignatureS: [
    1640161649771700932833151683605766558948110094112079974586279748238737601920n,
    793969069331474119331332801728102594224728382005232646705773198580972005784n,
    1919214721670036290117078263673402937104728511118444604896462911276910982030n
  ],

  // Entry modules [MAX_ENTRIES].
  /*PUB*/ entryObjectIndex: [0n, 0n, 0n, 0n, 0n, 1n, 1n, 1n, 2n, 0n],
  /*PUB*/ entryNameHash: [
    151251200029686127063327095456320040687905427497336635391695211041155747807n,
    134391921332508560099964544679493715295561887371159641958333364222734962117n,
    189299395894817028341377136440374346654807305685374867635317277536233949076n,
    300288658781160042600136958258128788307343035694769415667235118833120457708n,
    238072999318140247144340409210767592458149676910332477492128964242309639601n,
    342949817308325102533753023095764481919209045044694155820648303022684782250n,
    53263882652869188233442867997794714745800659178874616674229264640580912587n,
    426359027531308702550614983347627926388963727464163576225979855755198240161n,
    342949817308325102533753023095764481919209045044694155820648303022684782250n,
    151251200029686127063327095456320040687905427497336635391695211041155747807n
  ],
  /*PUB*/ entryIsValueHashRevealed: 341n,
  entryProofDepth: [5n, 4n, 5n, 5n, 4n, 3n, 3n, 3n, 3n, 5n],
  entryProofIndex: [0n, 14n, 4n, 8n, 12n, 0n, 2n, 4n, 0n, 0n],
  entryProofSiblings: [
    [
      9904028930859697121695025471312564917337032846528014134060777877259199866166n,
      3061484723492332507965148030160360459221544214848710312076669786481227696312n,
      1034918093316386824116250922167450510848513309806370785803679707656130099343n,
      1967460137183576823935940165748484233277693357918661365351807577356270673444n,
      17807035268217408168284551891421581960582995627579868198916345027521558073672n,
      0n,
      0n,
      0n
    ],
    [
      6111114915052368960013028357687874844561982077054171687671655940344165800007n,
      17388341916490019549185702457305159634089732163160991335774891791427848138239n,
      11096941554911766269591512438306543037648897778876512669092185697158334141884n,
      878417866821669669522076576747055310573348304334101916686376059972110407914n,
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
      17807035268217408168284551891421581960582995627579868198916345027521558073672n,
      0n,
      0n,
      0n
    ],
    [
      9904028930859697121695025471312564917337032846528014134060777877259199866166n,
      13668449146162081837160030987226451011104790516898257065617008244028191958016n,
      13367959075812247489073491246943547730887238023109366321601974217602143416556n,
      19447992562784698394687517181808908839437555749634616537692960194318245665263n,
      17807035268217408168284551891421581960582995627579868198916345027521558073672n,
      0n,
      0n,
      0n
    ],
    [
      15383263259644919292219180647511310006578861291492710261633820948219084286293n,
      7918679663012595984197891463489482800265672806180291933573986953773003320949n,
      11096941554911766269591512438306543037648897778876512669092185697158334141884n,
      878417866821669669522076576747055310573348304334101916686376059972110407914n,
      0n,
      0n,
      0n,
      0n
    ],
    [
      6111114915052368960013028357687874844561982077054171687671655940344165800007n,
      6376514122805686556057022362450217144216155426480889124042640416146259159616n,
      2475203300517048003967161333121686502473569082786308968237941737681242578523n,
      0n,
      0n,
      0n,
      0n,
      0n
    ],
    [
      5537782408586483095179205238470693004605299677776401318528976418642660549437n,
      20773279285022515108170558039293645952057292062999881653725415257517828272020n,
      2475203300517048003967161333121686502473569082786308968237941737681242578523n,
      0n,
      0n,
      0n,
      0n,
      0n
    ],
    [
      8093821485214269328389004542394237209037452657522929891144731833981969398000n,
      2720192215416253774358021860068355957407670823856560393117054770965832043978n,
      2357819815697692293410511834633713223342983901072503189827144862105057738355n,
      0n,
      0n,
      0n,
      0n,
      0n
    ],
    [
      10822224854462305974571008723353998025009741997958237435994986683037289495571n,
      20805589006174607077225502453211752083698893938887503022650477350039812475033n,
      1758151122517447416853548993762452057437739140782902232279705380156991021077n,
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
      17807035268217408168284551891421581960582995627579868198916345027521558073672n,
      0n,
      0n,
      0n
    ]
  ],

  // Virtual entry module.
  virtualEntryIsValueHashRevealed: 5n,

  // Entry constraint modules.
  /*PUB*/ entryEqualToOtherEntryByIndex: [
    3n,
    1n,
    2n,
    3n,
    4n,
    1n,
    6n,
    7n,
    8n,
    3n,
    12n,
    11n,
    12n
  ],

  // External nullifier for owner modules
  /*PUB*/ ownerExternalNullifier: 42n,

  // Owner module (0-1)
  /*PUB*/ ownerEntryIndex: [1n],
  ownerSemaphoreV3IdentityNullifier: [
    99353161014976810914716773124042455250852206298527174581112949561812190422n
  ],
  ownerSemaphoreV3IdentityTrapdoor: [
    329061722381819402313027227353491409557029289040211387019699013780657641967n
  ],
  /*PUB*/ ownerIsNullifierHashRevealed: [1n],

  // Owner V4 module (0-1)
  /*PUB*/ ownerV4EntryIndex: [8n],
  ownerSemaphoreV4SecretScalar: [
    1066921846450608811029566588127247112676112021489928135893407497485658369605n
  ],
  /*PUB*/ ownerV4IsNullifierHashRevealed: [1n],

  // Numeric value module (MAX_NUMERIC_VALUES)
  numericValues: [-5n, 0n, 0n, 0n],
  /*PUB*/ numericValueEntryIndices: [
    4n,
    21888242871839275222246405745257275088548364400416034343698204186575808495616n,
    21888242871839275222246405745257275088548364400416034343698204186575808495616n,
    21888242871839275222246405745257275088548364400416034343698204186575808495616n
  ],
  /*PUB*/ numericMinValues: [-10n, 0n, 0n, 0n],
  /*PUB*/ numericMaxValues: [132n, 0n, 0n, 0n],

  // Tuple module (1)
  /*PUB*/ tupleIndices: [[0n, 3n, 4n, 0n]],

  // List membership module (1)
  /*PUB*/ listComparisonValueIndex: [13n, 2n],
  /*PUB*/ listContainsComparisonValue: 1n,
  /*PUB*/ listValidValues: [
    [
      18036624749352198303579936579847660057464886967149502699608072589756763787195n,
      954489746909414943235318963334958574786280599689599263480891969739728384259n,
      14817656240911277280926105257184239284772234817449371516440573267665276657878n,
      18036624749352198303579936579847660057464886967149502699608072589756763787195n,
      18036624749352198303579936579847660057464886967149502699608072589756763787195n,
      18036624749352198303579936579847660057464886967149502699608072589756763787195n,
      18036624749352198303579936579847660057464886967149502699608072589756763787195n,
      18036624749352198303579936579847660057464886967149502699608072589756763787195n,
      18036624749352198303579936579847660057464886967149502699608072589756763787195n,
      18036624749352198303579936579847660057464886967149502699608072589756763787195n,
      18036624749352198303579936579847660057464886967149502699608072589756763787195n,
      18036624749352198303579936579847660057464886967149502699608072589756763787195n,
      18036624749352198303579936579847660057464886967149502699608072589756763787195n,
      18036624749352198303579936579847660057464886967149502699608072589756763787195n,
      18036624749352198303579936579847660057464886967149502699608072589756763787195n,
      18036624749352198303579936579847660057464886967149502699608072589756763787195n,
      18036624749352198303579936579847660057464886967149502699608072589756763787195n,
      18036624749352198303579936579847660057464886967149502699608072589756763787195n,
      18036624749352198303579936579847660057464886967149502699608072589756763787195n,
      18036624749352198303579936579847660057464886967149502699608072589756763787195n
    ],
    [
      418054148966205975783410155874827634853551522259146487067290966636892732647n,
      258071104886281019673049751947634554232920835393595101028404753707746639950n,
      182079048417179539545970732679096371357369048564078539272006698153726644528n,
      405595751139330719253651185729874002724136903095462474029135259130005398986n,
      335052023995624983314817417909713543427783448856740419267425738064439102915n,
      324520210211906104838118463364480817452902646208281319078648035184917687310n,
      418054148966205975783410155874827634853551522259146487067290966636892732647n,
      418054148966205975783410155874827634853551522259146487067290966636892732647n,
      418054148966205975783410155874827634853551522259146487067290966636892732647n,
      418054148966205975783410155874827634853551522259146487067290966636892732647n,
      418054148966205975783410155874827634853551522259146487067290966636892732647n,
      418054148966205975783410155874827634853551522259146487067290966636892732647n,
      418054148966205975783410155874827634853551522259146487067290966636892732647n,
      418054148966205975783410155874827634853551522259146487067290966636892732647n,
      418054148966205975783410155874827634853551522259146487067290966636892732647n,
      418054148966205975783410155874827634853551522259146487067290966636892732647n,
      418054148966205975783410155874827634853551522259146487067290966636892732647n,
      418054148966205975783410155874827634853551522259146487067290966636892732647n,
      418054148966205975783410155874827634853551522259146487067290966636892732647n,
      418054148966205975783410155874827634853551522259146487067290966636892732647n
    ]
  ],

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
    15383263259644919292219180647511310006578861291492710261633820948219084286293n,
    21888242871839275222246405745257275088548364400416034343698204186575808495616n,
    5537782408586483095179205238470693004605299677776401318528976418642660549437n,
    21888242871839275222246405745257275088548364400416034343698204186575808495616n,
    10822224854462305974571008723353998025009741997958237435994986683037289495571n,
    21888242871839275222246405745257275088548364400416034343698204186575808495616n
  ],
  virtualEntryRevealedValueHash: [
    8093821485214269328389004542394237209037452657522929891144731833981969398000n,
    21888242871839275222246405745257275088548364400416034343698204186575808495616n,
    8093821485214269328389004542394237209037452657522929891144731833981969398000n
  ],
  ownerRevealedNullifierHash: [
    1517081033071132720435657432021139876572843496027662548196342287861804968602n
  ],
  ownerV4RevealedNullifierHash: [
    894567425121403332266040643563918773524317789061280615331238253663051803519n
  ]
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
  params: ProtoPODGPCCircuitParams,
  isNullifierHashRevealed: boolean,
  isV4NullifierHashRevealed: boolean
): { inputs: ProtoPODGPCInputs; outputs: ProtoPODGPCOutputs } {
  // Test data is selected to exercise a lot of features at once, at full
  // size.  Test data always includes a max of 2 real objects and 6 entries.
  // Depending on parameters above, some will be left out of the proof, or
  // some proof inputs will remain unused.
  const testObjectsWithKeys: [PODEntries, string][] = [
    [sampleEntries, privateKey],
    [sampleEntries2, privateKey2],
    [sampleEntries3, privateKey]
  ];
  const testEntries = [
    { name: "A", objectIndex: 0, eqEntryIndex: 3 },
    { name: "owner", objectIndex: 0, eqEntryIndex: undefined },
    { name: "C", objectIndex: 0, eqEntryIndex: undefined },
    { name: "E", objectIndex: 0, eqEntryIndex: undefined },
    { name: "K", objectIndex: 0, eqEntryIndex: undefined }
  ];
  if (params.maxObjects > 1) {
    testEntries.push({ name: "attendee", objectIndex: 1, eqEntryIndex: 1 });
    testEntries.push({
      name: "eventID",
      objectIndex: 1,
      eqEntryIndex: undefined
    });
    // Public key is constrained to equal POD 0's signer's public key.
    testEntries.push({
      name: "pubKey",
      objectIndex: 1,
      eqEntryIndex: params.maxEntries
    });
  }
  if (params.maxObjects > 2) {
    testEntries.push({
      name: "attendee",
      objectIndex: 2,
      eqEntryIndex: undefined
    });
  }
  const sigOwnerEntryIndex = 1n;
  const hasOwner = params.maxEntries > sigOwnerEntryIndex;

  const sigOwnerV4EntryIndex = 8n;
  const hasOwnerV4 = params.maxEntries > sigOwnerV4EntryIndex;

  // Build and sign test PODs.
  const pods = [];
  const signatures = [];
  const publicKeys = [];
  for (const [inputEntries, privateKey] of testObjectsWithKeys) {
    const pod = POD.sign(inputEntries, privateKey);
    const verified = pod.verifySignature();
    expect(verified).to.be.true;
    pods.push(pod);
    signatures.push(decodeSignature(pod.signature));
    publicKeys.push(decodePublicKey(pod.signerPublicKey));
  }

  // Fill in ObjectModule inputs.
  const sigObjectContentID = [];
  const sigObjectSignerPubkeyAx: CircuitSignal[] = [];
  const sigObjectSignerPubkeyAy: CircuitSignal[] = [];
  const sigObjectSignatureR8x = [];
  const sigObjectSignatureR8y = [];
  const sigObjectSignatureS = [];
  for (let objectIndex = 0; objectIndex < params.maxObjects; objectIndex++) {
    // Unused objects get filled in with the same info as object 0.
    const isObjectEnabled = objectIndex < testObjectsWithKeys.length;
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
      sigEntryIsValueHashRevealed.push(0n);
      sigEntryRevealedValueHash.push(BABY_JUB_NEGATIVE_ONE);
    } else {
      sigEntryValue.push(
        entrySignals.value !== undefined ? entrySignals.value : 0n
      );
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

    // Fill in sibling array, padded with 0s to max length.
    sigEntryProofSiblings.push(
      extendedSignalArray(entrySignals.proof.siblings, params.merkleMaxDepth)
    );
  }

  // Virtual entry hash is arbitrarily revealed for even-numbered virtual
  // entries, which amounts to even-numbered objects.
  const maxVirtualEntries = paramMaxVirtualEntries(params);
  const sigVirtualEntryIsValueHashRevealed = sigObjectSignatureS.map((_, i) =>
    BigInt(1 - (i % 2))
  );
  const sigVirtualEntryRevealedValueHash =
    sigVirtualEntryIsValueHashRevealed.map((indicator, i) =>
      indicator === 0n
        ? BABY_JUB_NEGATIVE_ONE
        : poseidon2([sigObjectSignerPubkeyAx[i], sigObjectSignerPubkeyAy[i]])
    );

  // Constrain the 0th POD's signer's public key to equal the 2nd one's (if
  // there is one).  This will be the case due to our padding rule.
  const sigVirtualEntryEqualToOtherEntryByIndex = Array(maxVirtualEntries)
    .fill(0)
    .map((_, i) =>
      i === 0 && params.maxObjects > 2
        ? BigInt(params.maxEntries + 2)
        : BigInt(params.maxEntries + i)
    );

  // Constrain entry 4 (sampleEntries.K) to lie in the interval [-10n, 132n]
  const [
    numericValues,
    numericValueEntryIndices,
    numericMinValues,
    numericMaxValues
  ] =
    params.maxNumericValues === 0 || params.maxEntries < 5
      ? [[], [], [], []]
      : [
          padArray([sigEntryValue[4]], params.maxNumericValues, 0n),
          padArray([4n], params.maxNumericValues, BABY_JUB_NEGATIVE_ONE),
          padArray([-10n], params.maxNumericValues, 0n),
          padArray([132n], params.maxNumericValues, 0n)
        ];

  // A list of pairs of indices and values.
  // The values will be zipped together to form the
  // actual membership list.
  const listData = [
    [
      0,
      [sigEntryValue[0], 85n, 0n].map((x) => {
        return { type: "int", value: x };
      })
    ],
    [
      3,
      [sigEntryValue[3], 876n, 999n].map((x) => {
        return { type: "cryptographic", value: x };
      })
    ],
    [
      4,
      [sigEntryValue[4], 103n, 1n].map((x) => {
        return { type: "cryptographic", value: x };
      })
    ]
  ]
    .map((pair) => pair as [number, PODValue[]])
    // Omit those entry value indices outside of the appropriate range
    .filter((pair) => pair[0] < Math.min(params.maxEntries, testEntries.length))
    .slice(
      0,
      // Omit the tuples entirely if our circuit does not allow any.
      params.maxTuples === 0
        ? 0
        : maxTupleArity(params.maxTuples, params.tupleArity)
    );

  // Form lists, indices and indicators.
  const listComparisonValueIndex1 = listData.map((pair) => pair[0]);
  const list1 = zipLists(listData.map((pair) => pair[1]));
  const [listComparisonValueIndex2, list2]: [number[], PODValue[][]] = [
    [2],
    ["salut", "bună", "你好", "привет", "سلام", "שלום"].map((value) => {
      return [{ type: "string", value }];
    })
  ] as [number[], PODValue[][]];

  // Form lists of indices and membership lists, truncating where
  // necessary.
  const numLists = listComparisonValueIndex2.some((i) => i >= params.maxEntries)
    ? Math.min(1, params.maxLists)
    : params.maxLists;
  const indexIndicatorPairs = (
    [
      [listComparisonValueIndex1, 1],
      [listComparisonValueIndex2, 0]
    ] as [number[], number][]
  )
    // Omit index and indicator if the index is empty.
    .filter((pair) => pair[0].length > 0)
    .slice(0, numLists);

  const listComparisonValueIndices = indexIndicatorPairs.map((pair) => pair[0]);
  const isMember = indexIndicatorPairs.map((pair) => pair[1]);

  const listValidValuess = [list1, list2]
    // Omit list if it is empty
    .filter((list) => list.length > 0)
    .slice(0, numLists)
    // Truncate membership lists if necessary.
    .map((list) => list.slice(0, params.maxListElements));

  const { tupleIndices, listComparisonValueIndex, listValidValues } =
    processLists(params, listComparisonValueIndices, listValidValuess);

  const listContainsComparisonValue = array2Bits(
    extendedSignalArray(isMember.map(BigInt), params.maxLists, 1n)
  );

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
      entryIsValueHashRevealed: array2Bits(sigEntryIsValueHashRevealed),
      virtualEntryIsValueHashRevealed: array2Bits(
        sigVirtualEntryIsValueHashRevealed
      ),
      entryEqualToOtherEntryByIndex: sigEntryEqualToOtherEntryByIndex.concat(
        sigVirtualEntryEqualToOtherEntryByIndex
      ),
      entryProofDepth: sigEntryProofDepth,
      entryProofIndex: sigEntryProofIndex,
      entryProofSiblings: sigEntryProofSiblings,
      ownerExternalNullifier: 42n,
      ownerEntryIndex: [
        hasOwner ? sigOwnerEntryIndex : BABY_JUB_NEGATIVE_ONE
      ].slice(+!params.includeOwnerV3),
      ownerSemaphoreV3IdentityNullifier: [
        hasOwner ? ownerIdentity.nullifier : BABY_JUB_NEGATIVE_ONE
      ].slice(+!params.includeOwnerV3),
      ownerSemaphoreV3IdentityTrapdoor: [
        hasOwner ? ownerIdentity.trapdoor : BABY_JUB_NEGATIVE_ONE
      ].slice(+!params.includeOwnerV3),
      ownerIsNullifierHashRevealed: [isNullifierHashRevealed ? 1n : 0n].slice(
        +!params.includeOwnerV3
      ),
      ownerV4EntryIndex: [
        hasOwnerV4 ? sigOwnerV4EntryIndex : BABY_JUB_NEGATIVE_ONE
      ].slice(+!params.includeOwnerV4),
      ownerSemaphoreV4SecretScalar: [
        hasOwner ? ownerIdentityV4.secretScalar : 0n
      ].slice(+!params.includeOwnerV4),
      ownerV4IsNullifierHashRevealed: [
        isV4NullifierHashRevealed ? 1n : 0n
      ].slice(+!params.includeOwnerV4),
      numericValues,
      numericValueEntryIndices,
      numericMinValues,
      numericMaxValues,
      tupleIndices,
      listComparisonValueIndex,
      listContainsComparisonValue,
      listValidValues,
      globalWatermark: 1337n
    },
    outputs: {
      entryRevealedValueHash: sigEntryRevealedValueHash,
      virtualEntryRevealedValueHash: sigVirtualEntryRevealedValueHash,
      ownerRevealedNullifierHash: [
        isNullifierHashRevealed && hasOwner
          ? poseidon2([42n, ownerIdentity.nullifier])
          : BABY_JUB_NEGATIVE_ONE
      ].slice(+!params.includeOwnerV3),
      ownerV4RevealedNullifierHash: [
        isV4NullifierHashRevealed && hasOwnerV4
          ? poseidon2([42n, ownerIdentityV4.secretScalar])
          : BABY_JUB_NEGATIVE_ONE
      ].slice(+!params.includeOwnerV4)
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
      true /*isNullifierHashRevealed*/,
      true /*isV4NullifierHashRevealed*/
    );
    expect(inputs).to.deep.eq(sampleInput);
    expect(outputs).to.deep.eq(sampleOutput);
    await circuit.expectPass(inputs, outputs);

    for (const isV4NullifierHashRevealed of [true, false]) {
      ({ inputs, outputs } = makeTestSignals(
        GPC_PARAMS,
        false /*isNullifierHashRevealed*/,
        isV4NullifierHashRevealed
      ));
      await circuit.expectPass(inputs, outputs);
    }
  });

  it("should accept with different parameters", async () => {
    // { maxObjects: 3, maxEntries: 10, merkleMaxDepth: 8, ... } is the default
    // above, and is larger than the test data in all dimensions (so padding is
    // exercised).  What we're testing here is the ability to handle smaller
    // sizes, with truncated data as necessary.
    for (const params of ProtoPODGPC.CIRCUIT_PARAMETERS.map(
      (pair) => pair[0]
    )) {
      const { inputs, outputs } = makeTestSignals(
        params,
        true /*isNullifierHashRevealed*/,
        true /*isV4NullifierHashRevealed*/
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

describe("proto-pod-gpc.ProtoPODGPC (Compiled test artifacts) should work", function () {
  function prepGroth16Test(
    params: ProtoPODGPCCircuitParams
  ): CircuitArtifactPaths {
    const circuitDesc = ProtoPODGPC.pickCircuit(params);
    if (!circuitDesc) {
      throw new Error(
        `None of the circuit descriptions can accommodate the following parameters: ${JSON.stringify(
          params
        )}`
      );
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
    const artifacts = prepGroth16Test(GPC_PARAMS);
    await groth16Test(artifacts, sampleInput, sampleOutput);
  });

  it("should accept dynamic input", async () => {
    const artifacts = prepGroth16Test(GPC_PARAMS);

    let { inputs, outputs } = makeTestSignals(
      GPC_PARAMS,
      true /*isNullifierHashRevealed*/,
      true /*isV4NullifierHashRevealed*/
    );
    expect(inputs).to.deep.eq(sampleInput);
    expect(outputs).to.deep.eq(sampleOutput);
    await groth16Test(artifacts, inputs, outputs);

    for (const isV4NullifierHashRevealed of [true, false]) {
      ({ inputs, outputs } = makeTestSignals(
        GPC_PARAMS,
        false /*isNullifierHashRevealed*/,
        isV4NullifierHashRevealed
      ));
      await groth16Test(artifacts, inputs, outputs);
    }
  });

  it("should accept with each circuit in family", async () => {
    // { maxObjects: 3, maxEntries: 10, merkleMaxDepth: 8, ... } is the default
    // above, and is larger than the test data in all dimensions (so padding is
    // exercised).  What we're testing here is the ability to handle smaller
    // sizes, with truncated data as necessary.
    for (const cd of ProtoPODGPC.CIRCUIT_PARAMETERS.map((pair) => pair[0])) {
      // Skip the default (largest) config, already tested above.
      if (_.isEqual(cd, GPC_PARAMS)) {
        continue;
      }

      const artifacts = prepGroth16Test(cd);
      const { inputs, outputs } = makeTestSignals(
        cd,
        true /*isNullifierHashRevealed*/,
        true /*isV4NullifierHashRevealed*/
      );

      await groth16Test(artifacts, inputs, outputs);
    }
  });
});

// TODO(POD-P1): utests of statics and helpers in proto-pod-gpc.ts
