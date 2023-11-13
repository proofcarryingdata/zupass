import {
  ArgumentTypeName,
  BooleanArgument,
  DisplayOptions,
  NumberArgument,
  PCD,
  PCDPackage,
  ProveDisplayOptions,
  SerializedPCD,
  StringArgument
} from "@pcd/pcd-types";
import { requireDefinedParameter } from "@pcd/util";
import {
  Groth16Proof,
  prove as groth16Prove,
  verify as groth16Verify
} from "@zk-kit/groth16";
import { v4 as uuid } from "uuid";
import vkey from "../artifacts/circuit.json";
import { SecretPhraseCardBody } from "./CardBody";
import { phraseToBigints, usernameToBigint } from "./utils";

export const SecretPhrasePCDTypeName = "secret-phrase-pcd";
let savedInitArgs: SecretPhrasePCDInitArgs | undefined = undefined;

/**
 * Info required to initialize this PCD package.  These are the artifacts
 * associated with the circom circuit.
 */
export interface SecretPhrasePCDInitArgs {
  zkeyFilePath: string;
  wasmFilePath: string;
}

export type SecretPhrasePCDArgs = {
  /**
   * Determines whether the PCD should include the secret or not in the claim
   * Not used in ZK proof
   */
  includeSecret: BooleanArgument,

  /**
   * Publicly known Phrase ID that is used to look up rounds
   * Not used in ZK proof
   */
  phraseId: NumberArgument,

  /**
   * Publicly known username that is associated with phrase whisperers
   * Constrained in ZK proof
   */
  username: StringArgument,

  /**
   * The secret phrase that must be known to issue a PCD
   * Constrained in ZK proof
   */
  secret: StringArgument,
}

/**
 * Claim part of a SecretPhrasePCD contains all public/revealed fields.
 */
export interface SecretPhrasePCDClaim {
  phraseId: number,
  username: string,
  // include secret when issuing PCD, do not include secret when proving from zupass
  secret?: string,
  secretHash: string
}

/**
 * SecretPhrasePCD PCD type representation.
 */
export class SecretPhrasePCD implements PCD<SecretPhrasePCDClaim, Groth16Proof> {
  type = SecretPhrasePCDTypeName;
  public constructor(
    readonly id: string,
    readonly claim: SecretPhrasePCDClaim,
    readonly proof: Groth16Proof
  ) {
    this.id = id;
    this.claim = claim;
    this.proof = proof;
  }
}

export async function init(args: SecretPhrasePCDInitArgs) {
  savedInitArgs = args;
}

async function ensureInitialized(): Promise<SecretPhrasePCDInitArgs> {
  if (!savedInitArgs) {
    throw new Error(
      "Cannot initialize SecretPhrasePCDPacakge: init has not been called yet"
    );
  }

  return savedInitArgs;
}

/**
 * Ensure that inputs needed for the proof exist
 * 
 * @param args - args used in a SecretPhrase PCD
 * @returns - extracted proof inputs (must be marshalled into bigints)
 */
export function checkProofInputs(args: SecretPhrasePCDArgs): {
  includeSecret: boolean,
  username: string,
  secret: string,
  phraseId: number
} {
  // check username field
  const username = args.username.value;
  if (!username) {
    throw new Error("Cannot make The Word proof: missing username");
  } else if (username.length > 30) {
    throw new Error("Cannot make The Word proof: username too long (must be < 30 characters)");
  }

  // check secret field
  const secret = args.secret.value;
  if (!secret) {
    throw new Error("Cannot make The Word proof: missing secret");
  } else if (secret.length > 180) {
    throw new Error("Cannot make The Word proof: secret too long (must be < 180 characters)");
  }

  // check phraseId field
  const phraseId = args.phraseId.value;
  if (!phraseId) {
    throw new Error("Cannot make The Word proof: missing phraseId");
  }

  // set include secret to false by default if not included
  const includeSecret = args.includeSecret.value ? args.includeSecret.value : false;

  // return valid inputs
  return { username, secret, phraseId: Number(phraseId), includeSecret };
}

/**
 * Return the public signals needed to verify the claim's groth16 proof
 * 
 * @param claim - a PCD claim to knowledge of a secret phrase
 * @returns - the public signals in snarkjs-readable format
 */
function publicSignalsFromClaim(claim: SecretPhrasePCDClaim): string[] {
  const hash = claim.secretHash;
  const username = usernameToBigint(claim.username).toString();
  return [hash, username];
}

/**
 * Converts the proof inputs from strings to bigints that can fit in Bn254 field elements
 * 
 * @param username - the username to associate with the proof
 * @param secret - the secret phrase to prove knowledge of
 * @returns - the proof inputs in a format usable by the ZK circuit
 */
export function snarkInputForProof(username: string, secret: string):
  Record<string, `${number}` | `${number}`[]> {
  // marshall inputs into bn254 field elements
  const usernameBigint = usernameToBigint(username)
  const secretBigints = phraseToBigints(secret);

  // return as an object usable by the ZK circuit as inputs
  return {
    username: usernameBigint.toString(),
    phrase: secretBigints.map((num) => num.toString())
  } as Record<string, `${number}` | `${number}`[]>;
}

/**
 * Creates a new SecretPhrasePCD
 * 
 * @params args - the arguments to prove knowledge of a secret phrase
 * @return - a new SecretPhrasePCD
 */
export async function prove(
  args: SecretPhrasePCDArgs,
): Promise<SecretPhrasePCD> {
  // check that preliminary steps and conditions are met
  const initArgs = await ensureInitialized();

  // extract inputs for proof from SecretPhrasePCDArgs
  const { username, secret, phraseId, includeSecret } = checkProofInputs(args);

  // marshall inputs into bn254 field elements
  const snarkInput = snarkInputForProof(username, secret);

  // prove knowledge of the secret phrase
  const { proof, publicSignals } = await groth16Prove(
    snarkInput,
    initArgs.wasmFilePath,
    initArgs.zkeyFilePath
  );

  // extract the hash for which knowledge of preimage was proven
  const secretHash = publicSignals[0];

  // create claim
  const claim: SecretPhrasePCDClaim = {
    phraseId,
    username,
    secret: includeSecret ? secret : undefined,
    secretHash
  }

  return new SecretPhrasePCD(uuid(), claim, proof);
}

export async function verify(pcd: SecretPhrasePCD): Promise<boolean> {
  // get public signals
  const publicSignals = publicSignalsFromClaim(pcd.claim);
  // verify authenticity of PCD proof
  return await groth16Verify(vkey, { publicSignals, proof: pcd.proof });
}

/**
 * The replacer is used by `JSON.stringify` and, in this package, it is used within the
 * PCD's `serialize` function. It is called for each property on the JSON object and
 * converts the value of the property from a list of big integers to a list of hexadecimal
 * strings when the property's key name equals "message".
 * @param key The object property key.
 * @param value The object property value.
 * @returns The original value of the property or the converted one.
 */
function replacer(key: any, value: any): any {
  if (key === "message") {
    return value.map((num: bigint) => num.toString(16));
  } else {
    return value;
  }
}

/**
 * The reviver is used by `JSON.parse` and, in this package, it is used within the
 * PCD's `deserialize` function. It is called for each property on the JSON object and
 * converts the value of the property from a list of hexadecimal strings to a list of
 * big integers when the property's key name equals "message".
 * @param key The object property key.
 * @param value The object property value.
 * @returns The original value of the property or the converted one.
 */
function reviver(key: any, value: any): any {
  if (key === "message") {
    return value.map((str: string) => BigInt(`0x${str}`));
  } else {
    return value;
  }
}

/**
 * Get display options for a SecretPhrasePCD to show when proving a new PCD
 */
export function getProveDisplayOptions(): ProveDisplayOptions<SecretPhrasePCDArgs> {
  return {
    defaultArgs: {
      phraseId: {
        argumentType: ArgumentTypeName.Number,
        description: "The Round ID identifying the secret phrase",
      },
      username: {
        argumentType: ArgumentTypeName.String,
        description: "The username associated with this secret phrase proof",
      },
      secret: {
        argumentType: ArgumentTypeName.String,
        defaultVisible: false,
        description: "The secret phrase to prove knowledge of",
      },
      includeSecret: {
        argumentType: ArgumentTypeName.Boolean,
        description: "Set to true when storing in ZuPass and false when proving from zupass"
      }
    }
  };
}

/**
 * Serializes an {@link EdDSAPCD}.
 * @param pcd The EdDSA PCD to be serialized.
 * @returns The serialized version of the EdDSA PCD.
 */
export async function serialize(
  pcd: SecretPhrasePCD
): Promise<SerializedPCD<SecretPhrasePCD>> {
  return {
    type: SecretPhrasePCDTypeName,
    pcd: JSON.stringify(pcd, replacer)
  };
}

/**
 * Deserializes a serialized {@link EdDSAPCD}.
 * @param serialized The serialized PCD to deserialize.
 * @returns The deserialized version of the EdDSA PCD.
 */
export async function deserialize(serialized: string): Promise<SecretPhrasePCD> {
  const { id, claim, proof } = JSON.parse(serialized, reviver);

  requireDefinedParameter(id, "id");
  requireDefinedParameter(claim, "claim");
  requireDefinedParameter(proof, "proof");

  return new SecretPhrasePCD(id, claim, proof);
}

/**
 * Get display options for a SecretPhrasePCD.
 */
export function getDisplayOptions(pcd: SecretPhrasePCD): DisplayOptions {
  return {
    header: `The Word: Secret Phrase #${pcd.claim.phraseId}`,
    displayName: `The Word: Secret Phrase #${pcd.claim.phraseId}`
  };
}

/**
 * Returns true if a PCD is an Secret Phrase PCD, or false otherwise.
 */
export function isSecretPhrasePCD(pcd: PCD): pcd is SecretPhrasePCD {
  return pcd.type === SecretPhrasePCDTypeName;
}

export const SecretPhrasePCDPackage: PCDPackage<
  SecretPhrasePCDClaim,
  Groth16Proof,
  SecretPhrasePCDArgs,
  SecretPhrasePCDInitArgs
> = {
  name: SecretPhrasePCDTypeName,
  renderCardBody: SecretPhraseCardBody,
  getDisplayOptions,
  init,
  prove,
  verify,
  serialize,
  deserialize
}
