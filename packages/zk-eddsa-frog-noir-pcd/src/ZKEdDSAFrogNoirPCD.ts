import { BarretenbergBackend } from "@noir-lang/backend_barretenberg";
import { Abi, abiDecode, abiEncode, Field } from "@noir-lang/noirc_abi";
import { Noir, ProofData, WitnessMap } from "@noir-lang/noir_js";
import {
  EdDSAFrogPCD,
  EdDSAFrogPCDPackage,
  EdDSAFrogPCDTypeName,
  IFrogData,
  semaphoreIdToBigInt
} from "@pcd/eddsa-frog-pcd";
import type { EdDSAPublicKey } from "@pcd/eddsa-pcd";
import {
  ArgumentTypeName,
  BigIntArgument,
  DisplayOptions,
  PCD,
  PCDArgument,
  PCDPackage,
  ProveDisplayOptions,
  SerializedPCD
} from "@pcd/pcd-types";
import {
  SemaphoreIdentityPCD,
  SemaphoreIdentityPCDPackage
} from "@pcd/semaphore-identity-pcd";
import { STATIC_SIGNATURE_PCD_NULLIFIER } from "@pcd/semaphore-signature-pcd";
import {
  fromHexString,
  generateSnarkMessageHash,
  hexToBigInt,
  numberToBigInt,
  requireDefinedParameter
} from "@pcd/util";
import { buildEddsa, Eddsa } from "circomlibjs";
import JSONBig from "json-bigint";
import { v4 as uuid } from "uuid";
import { ZKEdDSAFrogCardBody } from "./CardBody";
import {
  EddsaSignature,
  Frog,
  PublicKey,
  SemaphoreIdentity,
  zk_eddsa_frog_noir_pcd_circuit
} from "./codegen";

/*
 * This external nullifier will be used if one is not provided.
 */
export const STATIC_ZK_EDDSA_FROG_NOIR_PCD_NULLIFIER = generateSnarkMessageHash(
  "hard-coded-zk-eddsa-frog-noir-pcd-nullifier"
);

/**
 * The global unique type name of the {@link ZKEdDSAFrogNoirPCD}.
 */
export const ZKEdDSAFrogNoirPCDTypeName = "zk-eddsa-frog-noir-pcd";

/**
 * Interface containing the arguments that 3rd parties use to
 * initialize this PCD package.
 * These are the artifacts associated with the circom circuit.
 */
export interface ZKEdDSAFrogNoirPCDInitArgs {}

let initArgs: ZKEdDSAFrogNoirPCDInitArgs | undefined = undefined;

/**
 * Defines the essential parameters required for creating an {@link ZKEdDSAFrogNoirPCD}.
 */
export type ZKEdDSAFrogNoirPCDArgs = {
  frog: PCDArgument<EdDSAFrogPCD>;

  identity: PCDArgument<SemaphoreIdentityPCD>;

  externalNullifier: BigIntArgument;

  watermark: BigIntArgument;
};

/**
 * Defines the ZKEdDSAEventTicketPCD claim.
 */
export interface ZKEdDSAFrogNoirPCDClaim {
  partialFrog: Partial<IFrogData>;
  signerPublicKey: EdDSAPublicKey;
  /**
   * Stringified `BigInt`.
   */
  externalNullifier: string;
  /**
   * Stringified `BigInt`.
   */
  nullifierHash: string;
  watermark: string;
}

/**
 * The ZK EdDSA Frog PCD enables the verification that an owner with a Semaphore
 * identity owns the EdDSA Frog PCD while keeping the owner's semaphore identity private.
 */
export class ZKEdDSAFrogNoirPCD
  implements PCD<ZKEdDSAFrogNoirPCDClaim, ProofData>
{
  type = ZKEdDSAFrogNoirPCDTypeName;

  public constructor(
    readonly id: string,
    readonly claim: ZKEdDSAFrogNoirPCDClaim,
    readonly proof: ProofData
  ) {
    this.id = id;
    this.claim = claim;
    this.proof = proof;
  }
}

export async function init(args: ZKEdDSAFrogNoirPCDInitArgs): Promise<void> {
  initArgs = args;
}

export function getProveDisplayOptions(): ProveDisplayOptions<ZKEdDSAFrogNoirPCDArgs> {
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
      externalNullifier: {
        argumentType: ArgumentTypeName.BigInt,
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

async function checkProveInputs(args: ZKEdDSAFrogNoirPCDArgs): Promise<{
  frogPCD: EdDSAFrogPCD;
  identityPCD: SemaphoreIdentityPCD;
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

  const externalNullifier =
    args.externalNullifier.value ||
    STATIC_ZK_EDDSA_FROG_NOIR_PCD_NULLIFIER.toString();
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
    externalNullifier,
    watermark: BigInt(args.watermark.value)
  };
}

function snarkInputForProof(
  frogPCD: EdDSAFrogPCD,
  identityPCD: SemaphoreIdentityPCD,
  externalNullifer: string,
  watermark: string
): {
  frog: Frog;
  frog_signer_pubkey: PublicKey;
  frog_signature: EddsaSignature;
  semaphore_identity: SemaphoreIdentity;
  external_nullifier: string;
  watermark: string;
} {
  const signerPubKey = frogPCD.proof.eddsaPCD.claim.publicKey;
  const rawSig = eddsa.unpackSignature(
    fromHexString(frogPCD.proof.eddsaPCD.proof.signature)
  );

  const frogData = frogPCD.claim.data;
  const frog: Frog = {
    id: numberToBigInt(frogData.frogId).toString(),
    biome: numberToBigInt(frogData.biome).toString(),
    rarity: numberToBigInt(frogData.rarity).toString(),
    temperament: numberToBigInt(frogData.temperament).toString(),
    jump: numberToBigInt(frogData.jump).toString(),
    speed: numberToBigInt(frogData.speed).toString(),
    intelligence: numberToBigInt(frogData.intelligence).toString(),
    beauty: numberToBigInt(frogData.beauty).toString(),
    timestamp_signed: numberToBigInt(frogData.timestampSigned).toString(),
    owner_semaphore_id: semaphoreIdToBigInt(
      frogData.ownerSemaphoreId
    ).toString(),
    reserved_field1: numberToBigInt(0).toString(),
    reserved_field2: numberToBigInt(0).toString(),
    reserved_field3: numberToBigInt(0).toString()
  };

  const semaphore_identity: SemaphoreIdentity = {
    nullifier: identityPCD.claim.identity.getNullifier().toString(),
    trapdoor: identityPCD.claim.identity.getTrapdoor().toString()
  };

  return {
    // Frog data fields
    frog,
    // Frog signature fields
    frog_signer_pubkey: {
      x: hexToBigInt(signerPubKey[0]).toString(),
      y: hexToBigInt(signerPubKey[1]).toString()
    },
    frog_signature: {
      r8_x: eddsa.F.toObject(rawSig.R8[0]).toString(),
      r8_y: eddsa.F.toObject(rawSig.R8[1]).toString(),
      s: rawSig.S.toString()
    },

    // Owner identity secret
    semaphore_identity,

    external_nullifier: externalNullifer,
    watermark
  };
}

// TODO: shift an analog of this into NoirJS
function get_public_abi(): Abi {
  const abi: Abi = JSON.parse(
    JSON.stringify(zk_eddsa_frog_noir_pcd_circuit.abi)
  );
  const public_parameters = abi.parameters.filter(
    (param) => param.visibility === "public"
  );
  abi.parameters = public_parameters;
  return abi;
}

function claimFromProofResult(
  frogPCD: EdDSAFrogPCD,
  publicWitnesses: WitnessMap
): ZKEdDSAFrogNoirPCDClaim {
  const public_abi = get_public_abi();
  const { inputs, return_value } = abiDecode(public_abi, publicWitnesses);
  const [nullifierHashHex, watermarkHex, revealed_frog] = return_value;

  const partialFrog: Partial<IFrogData> = {
    name: frogPCD.claim.data.name,
    description: frogPCD.claim.data.description,
    imageUrl: frogPCD.claim.data.imageUrl,

    frogId: parseInt(revealed_frog.id),
    biome: parseInt(revealed_frog.biome),
    rarity: parseInt(revealed_frog.rarity),
    temperament: parseInt(revealed_frog.temperament),
    jump: parseInt(revealed_frog.jump),
    speed: parseInt(revealed_frog.speed),
    intelligence: parseInt(revealed_frog.intelligence),
    beauty: parseInt(revealed_frog.beauty),
    timestampSigned: parseInt(revealed_frog.timestamp_signed),
    ownerSemaphoreId: BigInt(revealed_frog.owner_semaphore_id).toString()
  };

  const externalNullifier = BigInt(inputs.external_nullifier).toString();
  const watermark = BigInt(watermarkHex).toString();
  const nullifierHash = BigInt(nullifierHashHex).toString();

  return {
    partialFrog,
    signerPublicKey: frogPCD.proof.eddsaPCD.claim.publicKey,
    externalNullifier,
    watermark,
    nullifierHash
  };
}

/**
 * Creates a new ZKEdDSAFrogNoirPCD.
 */
export async function prove(
  args: ZKEdDSAFrogNoirPCDArgs
): Promise<ZKEdDSAFrogNoirPCD> {
  if (!initArgs) {
    throw new Error("cannot make proof: init has not been called yet");
  }

  await ensureEddsaInitialized();

  const { frogPCD, identityPCD, externalNullifier, watermark } =
    await checkProveInputs(args);

  const snarkInput = snarkInputForProof(
    frogPCD,
    identityPCD,
    externalNullifier,
    watermark.toString()
  );

  const program = zk_eddsa_frog_noir_pcd_circuit;
  const backend = new BarretenbergBackend(program, { threads: 8 });
  const noirProgram = new Noir(program, backend);

  const proof = await noirProgram.generateFinalProof(snarkInput);

  const claim = claimFromProofResult(frogPCD, proof.publicInputs);

  return new ZKEdDSAFrogNoirPCD(uuid(), claim, proof);
}

/**
 * Verify the claims and proof of a ZKEdDSAFrogNoirPCD.
 */
export async function verify(pcd: ZKEdDSAFrogNoirPCD): Promise<boolean> {
  const t = pcd.claim.partialFrog;
  const frog: Frog = {
    id: t.frogId?.toString() || "0",
    biome: t.biome?.toString() || "0",
    rarity: t.rarity?.toString() || "0",
    temperament: t.temperament?.toString() || "0",
    jump: t.jump?.toString() || "0",
    speed: t.speed?.toString() || "0",
    intelligence: t.intelligence?.toString() || "0",
    beauty: t.beauty?.toString() || "0",
    timestamp_signed: t.timestampSigned?.toString() || "0",
    owner_semaphore_id: t.ownerSemaphoreId?.toString() || "0",
    reserved_field1: "0",
    reserved_field2: "0",
    reserved_field3: "0"
  };

  const publicParameters: {
    frog_signer_pubkey: PublicKey;
    external_nullifier: Field;
  } = {
    frog_signer_pubkey: {
      x: "0x" + pcd.claim.signerPublicKey[0],
      y: "0x" + pcd.claim.signerPublicKey[1]
    },
    external_nullifier: pcd.claim.externalNullifier
  };
  const returnValue: [Field, Field, Frog] = [
    pcd.claim.nullifierHash,
    pcd.claim.watermark,
    frog
  ];

  const publicInputs = abiEncode(
    get_public_abi(),
    publicParameters,
    returnValue as any
  );

  const program = zk_eddsa_frog_noir_pcd_circuit;
  const backend = new BarretenbergBackend(program, { threads: 8 });
  const noirProgram = new Noir(program, backend);

  const claimed_proof = {
    proof: pcd.proof.proof,
    publicInputs
  };

  return noirProgram.verifyFinalProof(claimed_proof);
}

/**
 * Serialize an {@link ZKEdDSAFrogNoirPCD}.
 */
export async function serialize(
  pcd: ZKEdDSAFrogNoirPCD
): Promise<SerializedPCD<ZKEdDSAFrogNoirPCD>> {
  const serializable_pcd = {
    id: pcd.id,
    type: pcd.type,
    claim: pcd.claim,
    proof: {
      proof: "0x" + bufToBigInt(pcd.proof.proof).toString(16),
      publicInputs: [...pcd.proof.publicInputs.entries()]
    }
  };

  return {
    type: ZKEdDSAFrogNoirPCDTypeName,
    pcd: JSONBig({ useNativeBigInt: true }).stringify(serializable_pcd)
  } as SerializedPCD<ZKEdDSAFrogNoirPCD>;
}

/**
 * Deserializes a serialized {@link ZKEdDSAFrogNoirPCD}.
 */
export async function deserialize(
  serialized: string
): Promise<ZKEdDSAFrogNoirPCD> {
  const {
    id,
    claim,
    proof: serializable_proof
  } = JSONBig({ useNativeBigInt: true }).parse(serialized);

  requireDefinedParameter(id, "id");
  requireDefinedParameter(claim, "claim");
  requireDefinedParameter(serializable_proof, "proof");

  requireDefinedParameter(serializable_proof.proof, "proof.proof");
  requireDefinedParameter(
    serializable_proof.publicInputs,
    "proof.publicInputs"
  );
  const proof = bigIntToBuf(BigInt(serializable_proof.proof));
  const publicInputs: WitnessMap = new Map(serializable_proof.publicInputs);

  return new ZKEdDSAFrogNoirPCD(id, claim, { proof, publicInputs });
}

/**
 * Get display options for a ZKEdDSAFrogNoirPCD.
 */
export function getDisplayOptions(pcd: ZKEdDSAFrogNoirPCD): DisplayOptions {
  return {
    header: "ZK EdDSA Frog Noir PCD",
    displayName: "zk-eddsa-frog-noir-" + pcd.id.substring(0, 4)
  };
}

/**
 * Returns true if a PCD is an ZKEdDSAFrogNoirPCD, or false otherwise.
 */
export function isZKEdDSAFrogNoirPCD(pcd: PCD): pcd is ZKEdDSAFrogNoirPCD {
  return pcd.type === ZKEdDSAFrogNoirPCDTypeName;
}

/**
 * A PCD representing a proof of ownership of an EdDSA-signed frog.
 * The prover is able to prove ownership of a frog corresponding to their
 * semaphore identity, and keep their identity private.
 * The proof can also include a nullifier.
 */
export const ZKEdDSAFrogNoirPCDPackage: PCDPackage<
  ZKEdDSAFrogNoirPCDClaim,
  ProofData,
  ZKEdDSAFrogNoirPCDArgs,
  ZKEdDSAFrogNoirPCDInitArgs
> = {
  name: ZKEdDSAFrogNoirPCDTypeName,
  getDisplayOptions,
  renderCardBody: ZKEdDSAFrogCardBody,
  init,
  getProveDisplayOptions,
  prove,
  verify,
  serialize,
  deserialize
};

function bufToBigInt(buffer: Uint8Array) {
  const hex: string[] = [];

  buffer.forEach(function (i) {
    let h = i.toString(16);
    if (h.length % 2) {
      h = "0" + h;
    }
    hex.push(h);
  });

  return BigInt("0x" + hex.join(""));
}

function bigIntToBuf(bn: bigint): Uint8Array {
  const hex = bn.toString(16).padStart(64, "0");

  const len = hex.length / 2;
  const u8 = new Uint8Array(len);

  let i = 0;
  let j = 0;
  while (i < len) {
    u8[i] = parseInt(hex.slice(j, j + 2), 16);
    i += 1;
    j += 2;
  }

  return u8;
}
