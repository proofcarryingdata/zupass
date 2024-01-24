import {
  DisplayOptions,
  PCD,
  PCDPackage,
  SerializedPCD,
  StringArgument,
  StringArrayArgument
} from "@pcd/pcd-types";
import { fromHexString, requireDefinedParameter, toHexString } from "@pcd/util";
import { Eddsa, Point, buildEddsa } from "circomlibjs";
import { v4 as uuid } from "uuid";

/**
 * The globally unique type name of the {@link EdDSAPCD}.
 */
export const EdDSAPCDTypeName = "eddsa-pcd";

/**
 * An EdDSA public key is represented as a point on the elliptic curve, with each point being
 * a pair of coordinates consisting of hexadecimal strings. The public key is maintained in a standard
 * format and is internally converted to and from the Montgomery format as needed.
 */
export type EdDSAPublicKey = [string, string];

/**
 * Interface containing the arguments that 3rd parties use to
 * initialize this PCD package.
 * It is empty because this package does not implement the `init` function.
 */
export interface EdDSAInitArgs {}

/**
 * Defines the essential parameters required for creating an {@link EdDSAPCD}.
 */
export type EdDSAPCDArgs = {
  /**
   * The EdDSA private key is a 32-byte value used to sign the message.
   * {@link newEdDSAPrivateKey} is recommended for generating highly secure private keys.
   */
  privateKey: StringArgument;

  /**
   * The message is composed of a list of stringified big integers so that both `proof` and `claim`
   * can also be used within SNARK circuits, which operate on fields that are themselves big integers.
   */
  message: StringArrayArgument;

  /**
   * A string that uniquely identifies an {@link EdDSAPCD}. If this argument is not specified a random
   * id will be generated.
   */
  id: StringArgument;
};

/**
 * Defines the EdDSA PCD claim. The claim contains a message signed
 * with the private key corresponding to the given public key.
 */
export interface EdDSAPCDClaim {
  /**
   * An EdDSA public key corresponding to the EdDSA private key used
   * for signing the message.
   */
  publicKey: EdDSAPublicKey;

  /**
   * A list of big integers that were signed with the corresponding private key.
   */
  message: Array<bigint>;
}

/**
 * Defines the EdDSA PCD proof. The proof is the signature that proves
 * that the private key corresponding to the public key in the claim has been successfully
 * used to sign the message.
 */
export interface EdDSAPCDProof {
  /**
   * The EdDSA signature of the message as a hexadecimal string.
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

/**
 * A promise designed to make sure that the EdDSA algorithm
 * of the `circomlibjs` package has been properly initialized.
 * It only initializes them once.
 */
async function ensureInitialized(): Promise<void> {
  if (!initializedPromise) {
    initializedPromise = (async (): Promise<void> => {
      eddsa = await buildEddsa();
    })();
  }

  await initializedPromise;
}

/**
 * Creates a new {@link EdDSAPCD} by generating an {@link EdDSAPCDProof}
 * and deriving an {@link EdDSAPCDClaim} from the given {@link EdDSAPCDArgs}.
 */
export async function prove(args: EdDSAPCDArgs): Promise<EdDSAPCD> {
  await ensureInitialized();

  let message;

  if (!args.privateKey.value) throw new Error("No private key value provided");

  if (!args.message.value) throw new Error("No message value provided");

  try {
    // Converts the list of stringified big integers of the message to a list of big integers.
    // The reason there is a try/catch around it is to prevent users from passing in
    // anything other than stringified big integers to sign.
    message = args.message.value.map((fieldStr: string) => BigInt(fieldStr));
  } catch (e) {
    throw new Error("Could not convert message contents to bigint type");
  }

  // Retrieves the id from the arguments or creates a new random id.
  const id = typeof args.id.value === "string" ? args.id.value : uuid();
  const prvKey = fromHexString(args.privateKey.value);

  const hashedMessage = eddsa.poseidon(message);
  const publicKey = await getEdDSAPublicKey(prvKey);

  // Make the signature on the message.
  const signature = toHexString(
    eddsa.packSignature(eddsa.signPoseidon(prvKey, hashedMessage))
  );

  return new EdDSAPCD(id, { message, publicKey }, { signature });
}

/**
 * Verifies an EdDSA PCD by checking that its {@link EdDSAPCDClaim} corresponds to its {@link EdDSAPCDProof}.
 * If they match, the function returns true, otherwise false.
 */
export async function verify(pcd: EdDSAPCD): Promise<boolean> {
  try {
    await ensureInitialized();

    const signature = eddsa.unpackSignature(fromHexString(pcd.proof.signature));

    // `F.fromObject` converts a point from standard format to Montgomery.
    const pubKey = pcd.claim.publicKey.map((p) =>
      eddsa.F.fromObject(p)
    ) as Point;

    const hashedMessage = eddsa.poseidon(pcd.claim.message);

    return eddsa.verifyPoseidon(hashedMessage, signature, pubKey);
  } catch {
    return false;
  }
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
 * Serializes an {@link EdDSAPCD}.
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
 * Deserializes a serialized {@link EdDSAPCD}.
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
 * The PCD package of the EdDSA PCD. It exports an object containing
 * the code necessary to operate on this PCD data.
 */
export const EdDSAPCDPackage: PCDPackage<
  EdDSAPCDClaim,
  EdDSAPCDProof,
  EdDSAPCDArgs,
  EdDSAInitArgs
> = {
  name: EdDSAPCDTypeName,
  getDisplayOptions,
  prove,
  verify,
  serialize,
  deserialize
};

/**
 * Returns an {@link EdDSAPublicKey} derived from a 32-byte EdDSA private key.
 * The private key must be a hexadecimal string or a Uint8Array typed array.
 * @param privateKey The 32-byte EdDSA private key.
 * @returns The {@link EdDSAPublicKey} extracted from the private key.
 */
export async function getEdDSAPublicKey(
  privateKey: string | Uint8Array
): Promise<EdDSAPublicKey> {
  await ensureInitialized();

  if (typeof privateKey === "string") {
    privateKey = fromHexString(privateKey);
  }

  return eddsa.prv2pub(privateKey).map((p) =>
    // `F.toObject` converts a point from Montgomery format to a standard one.
    eddsa.F.toObject(p).toString(16).padStart(64, "0")
  ) as EdDSAPublicKey;
}
