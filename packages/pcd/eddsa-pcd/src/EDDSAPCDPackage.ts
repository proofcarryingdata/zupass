import { DisplayOptions, PCDPackage, SerializedPCD } from "@pcd/pcd-types";
import { fromHexString, requireDefinedParameter, toHexString } from "@pcd/util";
import {
  derivePublicKey,
  packSignature,
  signMessage,
  unpackSignature,
  verifySignature
} from "@zk-kit/eddsa-poseidon";
import { poseidon1 } from "poseidon-lite/poseidon1";
import { poseidon12 } from "poseidon-lite/poseidon12";
import { poseidon13 } from "poseidon-lite/poseidon13";
import { poseidon2 } from "poseidon-lite/poseidon2";
import { poseidon3 } from "poseidon-lite/poseidon3";
import { v4 as uuid } from "uuid";
import {
  EdDSAInitArgs,
  EdDSAPCD,
  EdDSAPCDArgs,
  EdDSAPCDClaim,
  EdDSAPCDProof,
  EdDSAPCDTypeName,
  EdDSAPublicKey
} from "./EdDSAPCD";

/**
 * Creates a new {@link EdDSAPCD} by generating an {@link EdDSAPCDProof}
 * and deriving an {@link EdDSAPCDClaim} from the given {@link EdDSAPCDArgs}.
 */
export async function prove(args: EdDSAPCDArgs): Promise<EdDSAPCD> {
  let message;

  if (!args.privateKey.value) throw new Error("No private key value provided");

  if (!args.message.value) throw new Error("No message value provided");

  try {
    // Converts the list of stringified big integers of the message to a list of big integers.
    // The reason there is a try/catch around it is to prevent users from passing in
    // anything other than stringified big integers to sign.
    message = args.message.value.map((fieldStr: string) => BigInt(fieldStr));
  } catch (e) {
    throw new Error(
      `Could not convert message contents ${e} to bigint type\n${e}\n${
        e instanceof Error ? e.stack : ""
      }`
    );
  }

  // Retrieves the id from the arguments or creates a new random id.
  const id = typeof args.id.value === "string" ? args.id.value : uuid();
  const prvKey = fromHexString(args.privateKey.value);

  const hashedMessage = poseidonHashMessage(message);
  const publicKey = await getEdDSAPublicKey(prvKey);

  // Make the signature on the message.
  const signature = toHexString(
    packSignature(signMessage(prvKey, hashedMessage))
  );

  return new EdDSAPCD(id, { message, publicKey }, { signature });
}

/**
 * Verifies an EdDSA PCD by checking that its {@link EdDSAPCDClaim} corresponds to its {@link EdDSAPCDProof}.
 * If they match, the function returns true, otherwise false.
 */
export async function verify(pcd: EdDSAPCD): Promise<boolean> {
  try {
    const signature = unpackSignature(fromHexString(pcd.proof.signature));

    // Note: `F.fromObject` converts a coordinate from standard format to
    // Montgomery form, which is expected by circomlibjs.  unpackSignature above
    // does the same for its R8 point.
    // This is a reference to Montgomery form of numbers for modular
    // multiplication, NOT Montgomery form of eliptic curves.  See https://en.wikipedia.org/wiki/Montgomery_modular_multiplication#Montgomery_form
    const pubKey = pcd.claim.publicKey.map((coordinateString: string) =>
      BigInt("0x" + coordinateString)
    ) as [bigint, bigint];

    const hashedMessage = poseidonHashMessage(pcd.claim.message);

    return verifySignature(hashedMessage, signature, pubKey);
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
function replacer(key: unknown, value: unknown): unknown {
  if (key === "message" && value instanceof Array) {
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
function reviver(key: unknown, value: unknown): unknown {
  if (key === "message" && value instanceof Array) {
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
  if (typeof privateKey === "string") {
    privateKey = fromHexString(privateKey);
  }

  return derivePublicKey(privateKey).map((coordinate: bigint) =>
    coordinate.toString(16).padStart(64, "0")
  ) as EdDSAPublicKey;
}

function poseidonHashMessage(message: bigint[]): bigint {
  switch (message.length) {
    case 1:
      // Used by PODs for value hashing, so no extra bundle size impact.
      return poseidon1(message);
    case 2:
      // Used by PODs for Merkle tree hasing, so no extra bundle size impact.
      return poseidon2(message);
    case 3:
      // Used by unit tests, including backward-compatibility with fixed values.
      // Used by GPCs for tuple hasing, so no extra bundle size impact.
      return poseidon3(message);
    case 12:
      // Tailored to the size of EdDSATicketPCD.
      return poseidon12(message);
    case 13:
      // Tailored to the size of EdDSAFrogPCD.
      return poseidon13(message);
    default:
      break;
  }
  throw new Error(
    `Unsupported EdDSAMessagePCD message size ${message.length}.`
  );
}
