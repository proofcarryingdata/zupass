import {
  EdDSAFrogPCD,
  EdDSAFrogPCDPackage,
  EdDSAFrogPCDTypeName,
  IFrogData,
  frogDataToBigInts
} from "@pcd/eddsa-frog-pcd";
import type { EdDSAPublicKey } from "@pcd/eddsa-pcd";
import {
  ArgumentTypeName,
  BigIntArgument,
  BooleanArgument,
  DisplayOptions,
  PCD,
  PCDArgument,
  PCDPackage,
  ProveDisplayOptions,
  RevealListArgument,
  SerializedPCD
} from "@pcd/pcd-types";
import {
  SemaphoreIdentityPCD,
  SemaphoreIdentityPCDPackage
} from "@pcd/semaphore-identity-pcd";
import { STATIC_SIGNATURE_PCD_NULLIFIER } from "@pcd/semaphore-signature-pcd";
import {
  BABY_JUB_NEGATIVE_ONE,
  babyJubIsNegativeOne,
  fromHexString,
  generateSnarkMessageHash,
  hexToBigInt,
  requireDefinedParameter
} from "@pcd/util";
import {
  Groth16Proof,
  prove as groth16Prove,
  verify as groth16Verify
} from "@zk-kit/groth16";
import { Eddsa, buildEddsa } from "circomlibjs";
import JSONBig from "json-bigint";
import { v4 as uuid } from "uuid";
import vkey from "../artifacts/circuit.json";
import { ZKEdDSAFrogCardBody } from "./CardBody";

/*
 * This external nullifier will be used if one is not provided.
 */
export const STATIC_ZK_EDDSA_FROG_PCD_NULLIFIER = generateSnarkMessageHash(
  "hard-coded-zk-eddsa-frog-pcd-nullifier"
);

/**
 * The global unique type name of the {@link ZKEdDSAFrogPCD}.
 */
export const ZKEdDSAFrogPCDTypeName = "zk-eddsa-frog-pcd";

/**
 * Specifies which fields of an EdDSAFrog should be revealed in a proof.
 */
export type EdDSAFrogFieldsToReveal = {
  revealFrogId?: boolean;
  revealBiome?: boolean;
  revealRarity?: boolean;
  revealTemperament?: boolean;
  revealJump?: boolean;
  revealSpeed?: boolean;
  revealIntelligence?: boolean;
  revealBeauty?: boolean;
  revealTimestampSigned?: boolean;
  revealOwnerSemaphoreId?: boolean;
};

/**
 * Interface containing the arguments that 3rd parties use to
 * initialize this PCD package.
 * These are the artifacts associated with the circom circuit.
 */
export interface ZKEdDSAFrogPCDInitArgs {
  zkeyFilePath: string;
  wasmFilePath: string;
}

let initArgs: ZKEdDSAFrogPCDInitArgs | undefined = undefined;

/**
 * Defines the essential paratmeters required for creating an {@link ZKEdDSAFrogPCD}.
 */
export type ZKEdDSAFrogPCDArgs = {
  frog: PCDArgument<EdDSAFrogPCD>;

  identity: PCDArgument<SemaphoreIdentityPCD>;

  // `fieldsToReveal`, `externalNullifier`, `revealNullifierHash`, and `watermark`
  // are usually app-specified
  fieldsToReveal: RevealListArgument<EdDSAFrogFieldsToReveal>;

  // A default external nullifier will be used if one is not provided.
  externalNullifier: BigIntArgument;
  revealNullifierHash: BooleanArgument;

  watermark: BigIntArgument;
};

/**
 * Defines the ZKEdDSAFrogPCD claim.
 */
export interface ZKEdDSAFrogPCDClaim {
  partialFrog: Partial<IFrogData>;
  signerPublicKey: EdDSAPublicKey;
  watermark: string;
  /**
   * Stringified `BigInt`.
   */
  externalNullifier: string;
  /**
   * Stringified `BigInt`.
   */
  nullifierHash?: string;
}

/**
 * ZKEdDSAFrogPCD PCD type representation.
 */
export class ZKEdDSAFrogPCD implements PCD<ZKEdDSAFrogPCDClaim, Groth16Proof> {
  type = ZKEdDSAFrogPCDTypeName;

  public constructor(
    readonly id: string,
    readonly claim: ZKEdDSAFrogPCDClaim,
    readonly proof: Groth16Proof
  ) {
    this.id = id;
    this.claim = claim;
    this.proof = proof;
  }
}

export async function init(args: ZKEdDSAFrogPCDInitArgs): Promise<void> {
  initArgs = args;
}

export function getProveDisplayOptions(): ProveDisplayOptions<ZKEdDSAFrogPCDArgs> {
  return {
    defaultArgs: {
      frog: {
        argumentType: ArgumentTypeName.PCD,
        description: "Generate a proof for the selected frog",
        validate(value, _) {
          if (value.type !== EdDSAFrogPCDTypeName || !value.claim) {
            return false;
          }
          return true;
        },
        validatorParams: {
          notFoundMessage: "You do not have any frogs."
        }
      },
      identity: {
        argumentType: ArgumentTypeName.PCD,
        defaultVisible: false,
        description:
          "Your Zupass comes with a primary Semaphore Identity which represents an user in the Semaphore protocol."
      },
      fieldsToReveal: {
        argumentType: ArgumentTypeName.ToggleList,
        displayName: "",
        description: "The following information will be revealed"
      },
      externalNullifier: {
        argumentType: ArgumentTypeName.BigInt,
        defaultVisible: false
      },
      revealNullifierHash: {
        argumentType: ArgumentTypeName.Boolean,
        defaultVisible: false
      },
      watermark: {
        argumentType: ArgumentTypeName.BigInt,
        defaultVisible: false
      }
    }
  };
}

let initializedPromise: Promise<void> | undefined;
let eddsa: Eddsa;

/**
 * A promise designed to make sure that the EdDSA algorithm
 * of the `circomlibjs` package has been properly initialized.
 * It only initializes them once.
 */
async function ensureEddsaInitialized() {
  if (!initializedPromise) {
    initializedPromise = (async () => {
      eddsa = await buildEddsa();
    })();
  }

  await initializedPromise;
}

async function checkProveInputs(args: ZKEdDSAFrogPCDArgs): Promise<{
  frogPCD: EdDSAFrogPCD;
  identityPCD: SemaphoreIdentityPCD;
  fieldsToReveal: EdDSAFrogFieldsToReveal;
  externalNullifier: string;
  watermark: bigint;
}> {
  const serializedFrogPCD = args.frog.value?.pcd;
  if (!serializedFrogPCD) {
    throw new Error("Cannot make proof: missing frog PCD");
  }

  const serializedIdentityPCD = args.identity.value?.pcd;
  if (!serializedIdentityPCD) {
    throw new Error("Cannot make proof: missing identity PCD");
  }

  const fieldsToReveal = args.fieldsToReveal.value;
  if (!fieldsToReveal) {
    throw new Error("Cannot make proof: missing fields request object");
  }

  const externalNullifier =
    args.externalNullifier.value ||
    STATIC_ZK_EDDSA_FROG_PCD_NULLIFIER.toString();
  if (externalNullifier === STATIC_SIGNATURE_PCD_NULLIFIER.toString()) {
    throw new Error(
      "Cannot make proof: same externalNullifier as SemaphoreSignaturePCD, which would break anonymity"
    );
  }

  if (!args.watermark.value) {
    throw new Error("Cannot make proof: missing watermark");
  }

  const frogPCD = await EdDSAFrogPCDPackage.deserialize(serializedFrogPCD);

  const identityPCD = await SemaphoreIdentityPCDPackage.deserialize(
    serializedIdentityPCD
  );

  return {
    frogPCD,
    identityPCD,
    fieldsToReveal,
    externalNullifier,
    watermark: BigInt(args.watermark.value)
  };
}

function snarkInputForProof(
  frogPCD: EdDSAFrogPCD,
  identityPCD: SemaphoreIdentityPCD,
  fieldsToReveal: EdDSAFrogFieldsToReveal,
  externalNullifer: string,
  revealNullifierHash: boolean,
  watermark: string
): Record<string, `${number}` | `${number}`[]> {
  const frogAsBigIntArray = frogDataToBigInts(frogPCD.claim.data);
  const signerPubKey = frogPCD.proof.eddsaPCD.claim.publicKey;
  const rawSig = eddsa.unpackSignature(
    fromHexString(frogPCD.proof.eddsaPCD.proof.signature)
  );

  return {
    // Frog data fields
    frogId: frogAsBigIntArray[0].toString(),
    revealFrogId: fieldsToReveal.revealFrogId ? "1" : "0",
    biome: frogAsBigIntArray[1].toString(),
    revealBiome: fieldsToReveal.revealBiome ? "1" : "0",
    rarity: frogAsBigIntArray[2].toString(),
    revealRarity: fieldsToReveal.revealRarity ? "1" : "0",
    temperament: frogAsBigIntArray[3].toString(),
    revealTemperament: fieldsToReveal.revealTemperament ? "1" : "0",
    jump: frogAsBigIntArray[4].toString(),
    revealJump: fieldsToReveal.revealJump ? "1" : "0",
    speed: frogAsBigIntArray[5].toString(),
    revealSpeed: fieldsToReveal.revealSpeed ? "1" : "0",
    intelligence: frogAsBigIntArray[6].toString(),
    revealIntelligence: fieldsToReveal.revealIntelligence ? "1" : "0",
    beauty: frogAsBigIntArray[7].toString(),
    revealBeauty: fieldsToReveal.revealBeauty ? "1" : "0",
    timestampSigned: frogAsBigIntArray[8].toString(),
    revealTimestampSigned: fieldsToReveal.revealTimestampSigned ? "1" : "0",
    ownerSemaphoreId: frogAsBigIntArray[9].toString(),
    revealOwnerSemaphoreId: fieldsToReveal.revealOwnerSemaphoreId ? "1" : "0",
    // These fields currently do not have any preset semantic meaning, although the intention
    // is for it to convert into a meaningful field in the future. We are reserving it now
    // so that we can keep the Circom configuration (.zkey and .wasm) as we add new fields,
    // and we would only need to change the TypeScript. For now, we will treat the inputs as
    // 0 in terms of signatures.
    reservedField1: frogAsBigIntArray[10].toString(),
    revealReservedField1: "0",
    reservedField2: frogAsBigIntArray[11].toString(),
    revealReservedField2: "0",
    reservedField3: frogAsBigIntArray[12].toString(),
    revealReservedField3: "0",

    // Frog signature fields
    frogSignerPubkeyAx: hexToBigInt(signerPubKey[0]).toString(),
    frogSignerPubkeyAy: hexToBigInt(signerPubKey[1]).toString(),
    frogSignatureR8x: eddsa.F.toObject(rawSig.R8[0]).toString(),
    frogSignatureR8y: eddsa.F.toObject(rawSig.R8[1]).toString(),
    frogSignatureS: rawSig.S.toString(),

    // Owner identity secret
    semaphoreIdentityNullifier: identityPCD.claim.identity
      .getNullifier()
      .toString(),
    semaphoreIdentityTrapdoor: identityPCD.claim.identity
      .getTrapdoor()
      .toString(),

    // Security features
    externalNullifier: externalNullifer,
    revealNullifierHash: revealNullifierHash ? "1" : "0",
    watermark: watermark
  } as Record<string, `${number}` | `${number}`[]>;
}

function claimFromProofResult(
  frogPCD: EdDSAFrogPCD,
  publicSignals: string[]
): ZKEdDSAFrogPCDClaim {
  const partialFrog: Partial<IFrogData> = {
    name: frogPCD.claim.data.name,
    description: frogPCD.claim.data.description,
    imageUrl: frogPCD.claim.data.imageUrl
  };

  if (!babyJubIsNegativeOne(publicSignals[0])) {
    partialFrog.frogId = parseInt(publicSignals[0]);
  }
  if (!babyJubIsNegativeOne(publicSignals[1])) {
    partialFrog.biome = parseInt(publicSignals[1]);
  }
  if (!babyJubIsNegativeOne(publicSignals[2])) {
    partialFrog.rarity = parseInt(publicSignals[2]);
  }
  if (!babyJubIsNegativeOne(publicSignals[3])) {
    partialFrog.temperament = parseInt(publicSignals[3]);
  }
  if (!babyJubIsNegativeOne(publicSignals[4])) {
    partialFrog.jump = parseInt(publicSignals[4]);
  }
  if (!babyJubIsNegativeOne(publicSignals[5])) {
    partialFrog.speed = parseInt(publicSignals[5]);
  }
  if (!babyJubIsNegativeOne(publicSignals[6])) {
    partialFrog.intelligence = parseInt(publicSignals[6]);
  }
  if (!babyJubIsNegativeOne(publicSignals[7])) {
    partialFrog.beauty = parseInt(publicSignals[7]);
  }
  if (!babyJubIsNegativeOne(publicSignals[8])) {
    partialFrog.timestampSigned = parseInt(publicSignals[8]);
  }
  if (!babyJubIsNegativeOne(publicSignals[9])) {
    partialFrog.ownerSemaphoreId = publicSignals[9];
  }

  // These fields are currently not typed or being used, but are being kept as
  // reserved fields that are hardcoded to zero and included in the preimage
  // of the hashed signature. As such, the flags for revealing these reserved
  // signed fields should always be -1 until they are being typed and used.
  if (!babyJubIsNegativeOne(publicSignals[10])) {
    throw new Error("ZkEdDSAFrogPCD: reservedField1 is not in use");
  }
  if (!babyJubIsNegativeOne(publicSignals[11])) {
    throw new Error("ZkEdDSAFrogPCD: reservedField2 is not in use");
  }
  if (!babyJubIsNegativeOne(publicSignals[12])) {
    throw new Error("ZkEdDSAFrogPCD: reservedField3 is not in use");
  }

  let nullifierHash = undefined;
  if (!babyJubIsNegativeOne(publicSignals[13])) {
    nullifierHash = publicSignals[13];
  }

  return {
    partialFrog,
    signerPublicKey: frogPCD.proof.eddsaPCD.claim.publicKey,
    externalNullifier: publicSignals[16],
    watermark: publicSignals[17],
    nullifierHash: nullifierHash
  };
}

/**
 * Creates a new ZKEdDSAFrogPCD.
 */
export async function prove(args: ZKEdDSAFrogPCDArgs): Promise<ZKEdDSAFrogPCD> {
  if (!initArgs) {
    throw new Error("cannot make proof: init has not been called yet");
  }

  await ensureEddsaInitialized();

  const { frogPCD, identityPCD, fieldsToReveal, externalNullifier, watermark } =
    await checkProveInputs(args);

  const snarkInput = snarkInputForProof(
    frogPCD,
    identityPCD,
    fieldsToReveal,
    externalNullifier,
    args.revealNullifierHash.value || false,
    watermark.toString()
  );

  const { proof, publicSignals } = await groth16Prove(
    snarkInput,
    initArgs.wasmFilePath,
    initArgs.zkeyFilePath
  );

  const claim = claimFromProofResult(frogPCD, publicSignals);

  return new ZKEdDSAFrogPCD(uuid(), claim, proof);
}

/**
 * Verify the claims and proof of a ZKEdDSAFrogPCD.
 */
export async function verify(pcd: ZKEdDSAFrogPCD): Promise<boolean> {
  // verify() requires dependencies but not artifacts (verification key
  // is available in code as vkey imported above), so doesn't require
  // full package initialization.

  const t = pcd.claim.partialFrog;

  const negOne = BABY_JUB_NEGATIVE_ONE.toString();

  // Outputs appear in public signals first
  const publicSignals = [
    t.frogId?.toString() || negOne,
    t.biome?.toString() || negOne,
    t.rarity?.toString() || negOne,
    t.temperament?.toString() || negOne,
    t.jump?.toString() || negOne,
    t.speed?.toString() || negOne,
    t.intelligence?.toString() || negOne,
    t.beauty?.toString() || negOne,
    t.timestampSigned?.toString() || negOne,
    t.ownerSemaphoreId?.toString() || negOne,
    negOne,
    negOne,
    negOne,
    pcd.claim.nullifierHash || negOne,
    hexToBigInt(pcd.claim.signerPublicKey[0]).toString(),
    hexToBigInt(pcd.claim.signerPublicKey[1]).toString(),
    pcd.claim.externalNullifier,
    pcd.claim.watermark
  ];
  return groth16Verify(vkey, { publicSignals, proof: pcd.proof });
}

/**
 * Serialize an {@link ZKEdDSAFrogPCD}.
 */
export async function serialize(
  pcd: ZKEdDSAFrogPCD
): Promise<SerializedPCD<ZKEdDSAFrogPCD>> {
  return {
    type: ZKEdDSAFrogPCDTypeName,
    pcd: JSONBig({ useNativeBigInt: true }).stringify(pcd)
  } as SerializedPCD<ZKEdDSAFrogPCD>;
}

/**
 * Deserializes a serialized {@link ZKEdDSAFrogPCD}.
 */
export async function deserialize(serialized: string): Promise<ZKEdDSAFrogPCD> {
  const { id, claim, proof } = JSONBig({ useNativeBigInt: true }).parse(
    serialized
  );

  requireDefinedParameter(id, "id");
  requireDefinedParameter(claim, "claim");
  requireDefinedParameter(proof, "proof");

  return new ZKEdDSAFrogPCD(id, claim, proof);
}

/**
 * Get display options for a ZKEdDSAFrogPCD.
 */
export function getDisplayOptions(pcd: ZKEdDSAFrogPCD): DisplayOptions {
  return {
    header: "ZKEdDSAFrogPCD",
    displayName: "zk-eddsa-frog-" + pcd.id.substring(0, 4)
  };
}

/**
 * Returns true if a PCD is an ZKEdDSAFrogPCD, or false otherwise.
 */
export function isZKEdDSAFrogPCD(pcd: PCD): pcd is ZKEdDSAFrogPCD {
  return pcd.type === ZKEdDSAFrogPCDTypeName;
}

/**
 * A PCD representing a proof of ownership of an EdDSA-signed frog.
 * The prover is able to prove ownership of a frog corresponding to their
 * semaphore identity. The prover can keep their identity private, and selectively
 * reveal some or none of the individual frog fields. To harden against
 * various abuses, the proof can be watermarked, and can include a nullifier.
 */
export const ZKEdDSAFrogPCDPackage: PCDPackage<
  ZKEdDSAFrogPCDClaim,
  Groth16Proof,
  ZKEdDSAFrogPCDArgs,
  ZKEdDSAFrogPCDInitArgs
> = {
  name: ZKEdDSAFrogPCDTypeName,
  getDisplayOptions,
  renderCardBody: ZKEdDSAFrogCardBody,
  init,
  getProveDisplayOptions,
  prove,
  verify,
  serialize,
  deserialize
};
