/**
 * @file This file contains all the methods needed to manage an EdDSA PCD.
 */

import {
  DisplayOptions,
  PCD,
  PCDPackage,
  SerializedPCD,
  StringArgument,
  StringArrayArgument
} from "@pcd/pcd-types";
import { fromHexString, toHexString } from "@pcd/util";
import { buildEddsa, buildPoseidon, Eddsa, Point, Poseidon } from "circomlibjs";
import { v4 as uuid } from "uuid";
import { EdDSACardBody } from "./CardBody";

/**
 * The representation of an EdDSA public key as a pair of points (hexadecimal strings)
 * on the elliptic curve.
 * 
 * @typedef {[string, string]} EDdSAPublicKey
 */
export type EDdSAPublicKey = [string, string];

/**
 * The globally-unique representation of the specific type of the PCD.
 * 
 * @constant
 */
export const EdDSAPCDTypeName = "eddsa-pcd";

/**
 * This interface defines the arguments required to initialize a PCD.
 * 
 * @summary The arguments to initialize a PCD.
 * @interface
 */
export interface EdDSAInitArgs {}

/**
 * This interface defines the arguments to make a new EdDSA PCD. The goal is 
 * to demonstrate that a certain EdDSA keypair is known by signing 
 * an array of messages using the correspondent private key.
 * 
 * @summary The arguments for an EdDSA PCD.
 * @interface
 */
export interface EdDSAPCDArgs {
  /**
   * Any 32-bytes EdDSA private key (32-bytes hexadecimal string) for signing the message.
   * Use {@link newEdDSAPrivateKey} to generate a new one securely.
   * 
   * @type {StringArgument}
   */
  privateKey: StringArgument;
  
  /**
   * An array of contents to be signed with the private key. 
   * The message is represented as a string version of a set of BigInts signing object.
   * 
   * @type {StringArrayArgument}
   */
  message: StringArrayArgument;
 
  /**
   * The unique identifier of the PCD.
   * 
   * @type {StringArgument}
   */
  id: StringArgument;
}

/**
 * This interface defines the arguments to make an EdDSA PCD claim.
 * The claim contains a message signed with the private key corresponding to the given public key.
 * 
 * @summary The arguments for an EdDSA PCD claim.
 * @interface
 */
export interface EdDSAPCDClaim {
  /**
   * An EdDSA public key corresponding to the EdDSA private key used 
   * for signing the message.
   *
   * @type {EDdSAPublicKey}
   */
  publicKey: EDdSAPublicKey;
  
  /**
   * An array of contents signed with the private key.
   * 
   * @type {Array<bigint>}
   */
  message: Array<bigint>;
}

/**
 * This interface defines the arguments to make an EdDSA PCD proof.
 * The proof is the signature which proves that the private key corresponding to the
 * public key in the claim, has been successfully used to sign the message.
 * 
 * @summary The arguments for an EdDSA PCD proof.
 * @interface
 */
export interface EdDSAPCDProof {
  /**
   * The EdDSA signature of the message.
   * 
   * @type {string}
   */
  signature: string;
}

/**
 * Create a new EdDSA PCD from an EdDSA PCD claim and proof.
 * 
 * @class 
 * @classdesc This class represents an EdDSA PCD.
 * @implements {PCD<EdDSAPCDClaim, EdDSAPCDProof>}
 */
export class EdDSAPCD implements PCD<EdDSAPCDClaim, EdDSAPCDProof> {
  /** @public */
  type = EdDSAPCDTypeName;

  /** @public */
  id: string;
  /** @public */
  claim: EdDSAPCDClaim;
  /** @public */
  proof: EdDSAPCDProof;

  /**
   * @public
   * @param {string} id - the unique identifier of the PCD.
   * @param {EdDSAPCDClaim} claim - the object containing the EdDSA PCD claim.
   * @param {EdDSAPCDProof} proof - the object containing the EdDSA PCD proof.
   */
  public constructor(id: string, claim: EdDSAPCDClaim, proof: EdDSAPCDProof) {
    this.id = id;
    this.claim = claim;
    this.proof = proof;
  }
}

/** 
 * This variable is a placeholder to check whether the {@link Eddsa} and {@link Poseidon} classes 
 * have been properly initialized from external library.
 * 
 * @see {@link https://github.com/iden3/circomlibjs/blob/main/src/eddsa.js#L9C31-L9C41}
 */
let initializedPromise: Promise<void> | undefined;
/** {@link Eddsa} */
let eddsa: Eddsa;
/** {@link Poseidon} */
let poseidon: Poseidon;

/**
 * Convert an hexadecimal string to an array Buffer.
 * 
 * @function fromHexString
 * @param {string} hexString - the hexadecimal string to be converted. 
 * @returns {Buffer} the Buffer representation of the hexadecimal string. 
 */
const fromHexString = (hexString: string) => Buffer.from(hexString, "hex");

/**
 * Convert an array Buffer to an hexadecimal string.
 * 
 * @function toHexString
 * @param {string} bytes - the array Buffer to be converted. 
 * @returns {string} the hexadecimal string representation of the array Buffer. 
 */
const toHexString = (bytes: Uint8Array) => Buffer.from(bytes).toString("hex");

/**
 * Initialize the {@link Eddsa} and {@link Poseidon} classes from external library
 * if and only if they have not been initialized.
 * 
 * @async
 * @function ensureInitialized
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
 * Make a new {@link EdDSAPCD} by generating a {@link EdDSAPCDProof} 
 * and deriving a {@link EdDSAPCDClaim} from the given input arguments.
 * 
 * @async
 * @function prove
 * @param {EdDSAPCDArgs} args - the set of arguments to make a new {@link EdDSAPCD}.
 * @returns {Promise<EdDSAPCD>} the {@link EdDSAPCD}.
 */
export async function prove(args: EdDSAPCDArgs): Promise<EdDSAPCD> {
  /** init & input sanity check */
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

  // Make the Poseidon hash of the message.
  const hashedMessage = poseidon(message);

  // Extract the corresponding EdDSA public key from the given EdDSA private key.
  const publicKey: EDdSAPublicKey = eddsa
    .prv2pub(prvKey)
    .map(toHexString) as EDdSAPublicKey;

  // Make the signature on the message.
  const signature = toHexString(
    eddsa.packSignature(eddsa.signPoseidon(prvKey, hashedMessage))
  );

  // Return the PCD by creating the claim and the proof.
  return new EdDSAPCD(id, { message, publicKey }, { signature });
}

/**
 * Verify if a given {@link EdDSAPCDClaim} corresponds 
 * to a given {@link EdDSAPCDProof}.
 * 
 * @param {EdDSAPCD} pcd - the {@link EdDSAPCD} to be verified.
 * @returns {boolean} true if the {@link EdDSAPCDClaim} corresponds 
 * to the {@link EdDSAPCDProof}; otherwise false.
 */
export async function verify(pcd: EdDSAPCD): Promise<boolean> {
  /** init */
  await ensureInitialized();

  // Unpack the signature.
  const signature = eddsa.unpackSignature(fromHexString(pcd.proof.signature));

  // Get the public key.
  const pubKey = pcd.claim.publicKey.map(fromHexString) as unknown as Point;

  // Make the Poseidon hash of the message.
  const hashedMessage = poseidon(pcd.claim.message);

  // Verify the signature.
  return eddsa.verifyPoseidon(hashedMessage, signature, pubKey);
}

/**
 * Replace a {@link EdDSAPCDArgs} argument content converting in strings the bigint values.
 *
 * @function replacer
 * @param {any} key - indicate the PCD arg to convert.
 * @param {any} value - indicate the value of the PCD arg to convert.
 * @returns {any} return the converted value as strings.
 */
function replacer(key: any, value: any): any {
  if (key === "message") {
    return value.map((num: bigint) => num.toString(16));
  } else {
    return value;
  }
}

/**
 * Replace a {@link EdDSAPCDArgs} argument content converting in bigints the string values.
 * 
 * @function reviver
 * @param {any} key - indicate the PCD arg to convert.
 * @param {any} value - indicate the value of the PCD arg to convert.
 * @returns {any} return the converted values as bigints.
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
 * This function use the {@link replacer} method under-the-hood.
 * 
 * @async
 * @function serialize
 * @param {EdDSAPCD} pcd - the EdDSA PCD to be serialized. 
 * @returns {Promise<SerializedPCD<EdDSAPCD>>} the serialized version of the EdDSA PCD.
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
 * This function use the {@link reviver} method under-the-hood.
 * 
 * @async
 * @function deserialize
 * @param {string} serialized - the serialized PCD to deserialize. 
 * @returns {Promise<EdDSAPCD>} the deserialized version of the EdDSA PCD.
 */
export async function deserialize(serialized: string): Promise<EdDSAPCD> {
  return JSON.parse(serialized, reviver);
}

/**
 * Return the information on how the {@link EdDSAPCD} should be displayed 
 * to the user within the PCD Passport.
 * 
 * @function getDisplayOptions
 * @param {EdDSAPCD} pcd - the EdDSA PCD from which to show the information. 
 * @returns {DisplayOptions} the information to display for an {@link EdDSAPCD}.
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
 * 
 * @constant
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

/** @ignore */
export async function getEdDSAPublicKey(
  privateKey: string
): Promise<EDdSAPublicKey> {
  await ensureInitialized();

  return eddsa
    .prv2pub(fromHexString(privateKey))
    .map(toHexString) as EDdSAPublicKey;
}
