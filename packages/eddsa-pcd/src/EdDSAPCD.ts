import {
  DisplayOptions,
  PCD,
  PCDPackage,
  SerializedPCD,
  StringArgument,
  StringArrayArgument
} from "@pcd/pcd-types";
import { fromHexString, toHexString, requireDefinedParameter } from "@pcd/util";
import { buildEddsa, buildPoseidon, Eddsa, Point, Poseidon } from "circomlibjs";
import { v4 as uuid } from "uuid";
import { EdDSACardBody } from "./CardBody";

/**
 * The representation of an EdDSA public key as a pair of points (hexadecimal strings)
 * on the elliptic curve.
 */
export type EDdSAPublicKey = [string, string];

/** 
 * The globally unique type name of the EdDSAPCD.
 */
export const EdDSAPCDTypeName = "eddsa-pcd";

/**
 * Defines the arguments required to initialize a PCD.
 * It is currently empty but new arguments may be added in the future.
 */
export interface EdDSAInitArgs {}

/**
 * Defines the essential parameters required for creating an {@link EdDSAPCD}.
 */
export interface EdDSAPCDArgs {
  /**
   * The EdDSA private key is a 32-byte value used to sign the message.
   * {@link newEdDSAPrivateKey} is a recommended choice for generating highly secure private keys.
   */
  privateKey: StringArgument;
  
  /**
   * The message is composed of a list of stringified big integer so that both `proof` and `claim`
   * can also be utilized within SNARK circuits, which operate on fields that are themselves big integers. 
   */
  message: StringArrayArgument;
 
  /**
   * A string that uniquely identifies a PCD. 
   */
  id: StringArgument;
}

/**
 * Defines the EdDSA PCD claim. The claim contains a message signed 
 * with the private key corresponding to the given public key.
 */
export interface EdDSAPCDClaim {
  /**
   * An EdDSA public key corresponding to the EdDSA private key used 
   * for signing the message.
   */
  publicKey: EDdSAPublicKey;
  
  /** An array of signed contents (BigInts) with the corresponding private key. */
  message: Array<bigint>;
}

/**
 * This interface defines the EdDSA PCD proof. The proof is the signature which proves 
 * that the private key corresponding to the public key in the claim, has been successfully 
 * used to sign the message.
 */
export interface EdDSAPCDProof {
  /**
   * The EdDSA signature of the message as hexadecimal string.
   */
  signature: string;
}

/**
 * The EdDSA PCD enables the verification that a specific message has been signed with an
 * EdDSA private key. The {@link EdDSAPCDProof}, serving as the signature, is verified
 * using the {@link EdDSAPCDClaim}, which consists of the EdDSA public key and the message.
 */
export class EdDSAPCD implements PCD<EdDSAPCDClaim, EdDSAPCDProof> {
  public type = EdDSAPCDTypeName;

  public id: string;
  public claim: EdDSAPCDClaim;
  public proof: EdDSAPCDProof;

  public constructor(id: string, claim: EdDSAPCDClaim, proof: EdDSAPCDProof) {
    this.id = id;
    this.claim = claim;
    this.proof = proof;
  }
}

let initializedPromise: Promise<void> | undefined;
let eddsa: Eddsa;
let poseidon: Poseidon;

/** 
 * A promise designed to make sure that the EdDSA and Poseidon algorithms
 * of the `circomlib` package have been properly initialized.
 * It only initializes them once.
 */
async function ensureInitialized() {
  if (!initializedPromise) {
    initializedPromise = (async () => {
      eddsa = await buildEddsa();
      poseidon = await buildPoseidon();
    })();
  }

  await initializedPromise;
}

/**
 * Creates a new {@link EdDSAPCD} by generating a {@link EdDSAPCDProof}
 * and deriving a {@link EdDSAPCDClaim} from the given {@link EdDSAPCDArgs}.
 * @param args The set of arguments to make a new {@link EdDSAPCD}.
 * @returns An instance of the EdDSA PCD.
 */
export async function prove(args: EdDSAPCDArgs): Promise<EdDSAPCD> {
  await ensureInitialized();

  let message;

  if (!args.privateKey.value)
    throw new Error("No private key value provided");

  if (!args.message.value)
    throw new Error("No message value provided");
  
  try {
    // Converts to BigInt the stringified message content.
    message = args.message.value.map((fieldStr: string) => BigInt(fieldStr));
  } catch (e) {
    throw new Error("Could not convert message contents to bigint type");
  }

  // Recover or create a new PCD unique identifier.
  const id = typeof args.id.value === "string" ? args.id.value : uuid();
  const prvKey = fromHexString(args.privateKey.value);

  const hashedMessage = poseidon(message);

  // Extract the corresponding EdDSA public key from the given EdDSA private key.
  const publicKey: EDdSAPublicKey = eddsa
    .prv2pub(prvKey)
    .map(toHexString) as EDdSAPublicKey;

  // Make the signature on the message.
  const signature = toHexString(
    eddsa.packSignature(eddsa.signPoseidon(prvKey, hashedMessage))
  );

  return new EdDSAPCD(id, { message, publicKey }, { signature });
}

/**
 * Verifies if a given {@link EdDSAPCDClaim} corresponds to a given {@link EdDSAPCDProof}.
 * @param pcd The {@link EdDSAPCD} to be verified.
 * @returns true if the {@link EdDSAPCDClaim} corresponds to the {@link EdDSAPCDProof}, otherwise false.
 */
export async function verify(pcd: EdDSAPCD): Promise<boolean> {
  await ensureInitialized();

  const signature = eddsa.unpackSignature(fromHexString(pcd.proof.signature));

  const pubKey = pcd.claim.publicKey.map(fromHexString) as unknown as Point;

  const hashedMessage = poseidon(pcd.claim.message);

  return eddsa.verifyPoseidon(hashedMessage, signature, pubKey);
}

/**
 * Replaces the content of an {@link EdDSAPCDArgs} converting strings to big integers.
 * @param key The PCD argument name to convert.
 * @param value The PCD argument value to convert.
 * @returns The converted value as strings.
 */
function replacer(key: any, value: any): any {
  if (key === "message") {
    return value.map((num: bigint) => num.toString(16));
  } else {
    return value;
  }
}

/**
 * Replaces the content of an {@link EdDSAPCDArgs} converting big integers to strings.
 * @param key The PCD argument name to be converted.
 * @param value The PCD argument value to be converted.
 * @returns The converted value as BigInt values.
 */
function reviver(key: any, value: any): any {
  if (key === "message") {
    return value.map((str: string) => BigInt(`0x${str}`));
  } else {
    return value;
  }
}

/**
 * Serialize an {@link EdDSAPCD} to {@link SerializedPCD<EdDSAPCD>}.
 * @param pcd The EdDSA PCD to be serialized. 
 * @returns The serialized version of the EdDSA PCD.
 */
export async function serialize(
  pcd: EdDSAPCD
): Promise<SerializedPCD<EdDSAPCD>> {
  return {
    type: EdDSAPCDTypeName,
    pcd: JSON.stringify(pcd, replacer)
  };
}

/**
 * Deserialize a {@link SerializedPCD<EdDSAPCD>} to {@link EdDSAPCD}.
 * @param serialized The serialized PCD to deserialize. 
 * @returns The deserialized version of the EdDSA PCD.
 */
export async function deserialize(serialized: string): Promise<EdDSAPCD> {
  const { id, claim, proof } = JSON.parse(serialized, reviver);

  requireDefinedParameter(id, "id");
  requireDefinedParameter(claim, "claim");
  requireDefinedParameter(proof, "proof");

  return new EdDSAPCD(id, claim, proof);
}

/**
 * Provides the information about the {@link EdDSAPCD} that will be displayed
 * to users on Zupass.
 * @param pcd The EdDSA PCD instance. 
 * @returns The information to be displayed, specifically `header` and `displayName`.
 */
export function getDisplayOptions(pcd: EdDSAPCD): DisplayOptions {
  return {
    header: "EdDSA Signature",
    displayName: "eddsa-sig-" + pcd.id.substring(0, 4)
  };
}

/** 
 * A PCD-conforming wrapper to sign (and prove) messages (signed) 
 * using an EdDSA key(pair).
 */
export const EdDSAPCDPackage: PCDPackage<
  EdDSAPCDClaim,
  EdDSAPCDProof,
  EdDSAPCDArgs,
  EdDSAInitArgs
> = {
  name: EdDSAPCDTypeName,
  renderCardBody: EdDSACardBody,
  getDisplayOptions,
  prove,
  verify,
  serialize,
  deserialize
};

/**
 * Returns an {@link EDdSAPublicKey} extracted from a 32-byte EdDSA private key.
 * The private key must be a hexadecimal string.
 * @param privateKey The 32-byte EdDSA private key.
 * @returns The {@link EDdSAPublicKey} extracted from the private key.
 */
export async function getEdDSAPublicKey(
  privateKey: string
): Promise<EDdSAPublicKey> {
  await ensureInitialized();

  return eddsa
    .prv2pub(fromHexString(privateKey))
    .map(toHexString) as EDdSAPublicKey;
}
