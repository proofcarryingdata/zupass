import NodeRSA from "node-rsa";
import {
  assert,
  bytesToBigInt,
  stringToBytes,
  toCircomBigIntBytes,
  Uint8ArrayToString,
} from "./binaryFormat";
import { CIRCOM_FIELD_MODULUS, MAX_HEADER_PADDED_BYTES } from "./constants";
import { partialSha, sha256Pad, shaHash } from "./shaHash";

export interface ICircuitInputs {
  modulus?: string[];
  signature?: string[];
  base_message?: string[];
  in_padded?: string[];
  in_body_padded?: string[];
  in_body_len_padded_bytes?: string;
  in_padded_n_bytes?: string[];
  in_len_padded_bytes?: string;
  in_body_hash?: string[];
  precomputed_sha?: string[];
  body_hash_idx?: string;
  addressParts?: string[];
  address?: string;
  address_plus_one?: string;
  twitter_username_idx?: string;
}

enum CircuitType {
  RSA = "rsa",
  SHA = "sha",
  TEST = "test",
  EMAIL = "email",
}

async function findSelector(
  a: Uint8Array,
  selector: number[]
): Promise<number> {
  let i = 0;
  let j = 0;
  while (i < a.length) {
    if (a[i] === selector[j]) {
      j++;
      if (j === selector.length) {
        return i - j + 1;
      }
    } else {
      j = 0;
    }
    i++;
  }
  return -1;
}

export async function getCircuitInputs(
  rsa_signature: BigInt,
  rsa_modulus: BigInt,
  message: Buffer
): Promise<{
  valid: {
    validSignatureFormat?: boolean;
    validMessage?: boolean;
  };
  circuitInputs: ICircuitInputs;
}> {
  console.log("Starting processing of inputs");
  // Derive modulus from signature
  // const modulusBigInt = bytesToBigInt(pubKeyParts[2]);
  const modulusBigInt = rsa_modulus;
  // Message is the email header with the body hash
  const prehash_message_string = message;
  // const baseMessageBigInt = AAYUSH_PREHASH_MESSAGE_INT; // bytesToBigInt(stringToBytes(message)) ||
  // const postShaBigint = AAYUSH_POSTHASH_MESSAGE_PADDED_INT;
  const signatureBigInt = rsa_signature;

  // Perform conversions
  const prehashBytesUnpadded =
    typeof prehash_message_string == "string"
      ? new TextEncoder().encode(prehash_message_string)
      : Uint8Array.from(prehash_message_string);
  const postShaBigintUnpadded =
    bytesToBigInt(
      stringToBytes((await shaHash(prehashBytesUnpadded)).toString())
    ) % CIRCOM_FIELD_MODULUS;

  // Sha add padding
  const [messagePadded, messagePaddedLen] = await sha256Pad(
    prehashBytesUnpadded,
    MAX_HEADER_PADDED_BYTES
  );

  // Ensure SHA manual unpadded is running the correct function
  const shaOut = await partialSha(messagePadded, messagePaddedLen);
  assert(
    (await Uint8ArrayToString(shaOut)) ===
      (await Uint8ArrayToString(
        Uint8Array.from(await shaHash(prehashBytesUnpadded))
      )),
    "SHA256 calculation did not match!"
  );

  // Compute identity revealer
  let circuitInputs;
  const modulus = toCircomBigIntBytes(modulusBigInt);
  const signature = toCircomBigIntBytes(signatureBigInt);
  const base_message = toCircomBigIntBytes(postShaBigintUnpadded);

  circuitInputs = {
    modulus,
    signature,
    base_message,
  };

  return {
    circuitInputs,
    valid: {},
  };
}

export async function generate_inputs(): Promise<ICircuitInputs> {
  const key = new NodeRSA({ b: 2048 });
  const message = Uint8Array.from([0xff, 0xfa]);
  const components = key.exportKey("components-public");
  console.log(components.n.toString("hex"));
  const modulusBigInt = BigInt(`0x${components.n.toString("hex")}`);
  const exponentBigInt =
    typeof components.e === "number"
      ? BigInt(components.e)
      : BigInt(`0x${components.e.toString("hex")}`);
  console.log("exponent: ", exponentBigInt);
  console.log("modulus: ", modulusBigInt);
  const signatureBuffer = key.sign(message);
  const signatureBigInt = BigInt(`0x${signatureBuffer.toString("hex")}`);
  console.log("signature: ", signatureBigInt);

  const inputs = await getCircuitInputs(
    signatureBigInt,
    modulusBigInt,
    Buffer.from(message)
  );

  console.log(inputs);

  return inputs.circuitInputs;
}
