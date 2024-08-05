import { DisplayOptions, PCDPackage, SerializedPCD } from "@pcd/pcd-types";
import { fromHexString, requireDefinedParameter, toHexString } from "@pcd/util";
import { Eddsa, Point, buildEddsa } from "circomlibjs";
import { v4 as uuid } from "uuid";
import {
  EdDSAInitArgs,
  EdDSAPCD,
  EdDSAPCDArgs,
  EdDSAPCDClaim,
  EdDSAPCDProof,
  EdDSAPCDTypeName,
  EdDSAPublicKey
} from "./EdDSAPCD.js";

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
    throw new Error(
      `Could not convert message contents ${e} to bigint type\n${e}\n${
        e instanceof Error ? e.stack : ""
      }`
    );
  }

  // Retrieves the id from the arguments or creates a new random id.
  const id = typeof args.id.value === "string" ? args.id.value : uuid();
  const prvKey = fromHexString(args.privateKey.value);

  const hashedMessage = eddsa.poseidon(message);
  const publicKey = await getEdDSAPublicKey(prvKey);

  // Make the signature on the message.
  // Note: packSignature converts the R8 coordinates from Mongtomery form to
  // standard form for use outside of circomlibjs.
  // This is a reference to Montgomery form of numbers for modular
  // multiplication, NOT Montgomery form of eliptic curves.  See https://en.wikipedia.org/wiki/Montgomery_modular_multiplication#Montgomery_form
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

    // Note: `F.fromObject` converts a coordinate from standard format to
    // Montgomery form, which is expected by circomlibjs.  unpackSignature above
    // does the same for its R8 point.
    // This is a reference to Montgomery form of numbers for modular
    // multiplication, NOT Montgomery form of eliptic curves.  See https://en.wikipedia.org/wiki/Montgomery_modular_multiplication#Montgomery_form
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
  await ensureInitialized();

  if (typeof privateKey === "string") {
    privateKey = fromHexString(privateKey);
  }

  return eddsa.prv2pub(privateKey).map((p) =>
    // Note: `F.toObject` converts a point from the Montgomery format used by
    // circomlibjs to standard form.
    // This is a reference to Montgomery form of numbers for modular
    // multiplication, NOT Montgomery form of eliptic curves.  See https://en.wikipedia.org/wiki/Montgomery_modular_multiplication#Montgomery_form
    eddsa.F.toObject(p).toString(16).padStart(64, "0")
  ) as EdDSAPublicKey;
}
