import JSONBig from "json-bigint";
import {
  PODEntries,
  PODValue,
  POD_CRYPTOGRAPHIC_MAX,
  POD_CRYPTOGRAPHIC_MIN,
  POD_INT_MAX,
  POD_INT_MIN,
  POD_NAME_REGEX
} from "./podTypes";

const PRIVATE_KEY_REGEX = new RegExp(/^[0-9A-Za-z]{64}$/);
const PUBLIC_KEY_REGEX = new RegExp(/^[0-9A-Za-z]{64}$/);
const SIGNATURE_REGEX = new RegExp(/^[0-9A-Za-z]{128}$/);

export function checkPrivateKeyFormat(privateKey: string): string {
  if (!privateKey.match(PRIVATE_KEY_REGEX)) {
    throw new TypeError("Private key should be 32 bytes hex-encoded.");
  }
  return privateKey;
}

export function checkPublicKeyFormat(publicKey: string): string {
  if (!publicKey.match(PUBLIC_KEY_REGEX)) {
    throw new TypeError("Public key should be 32 bytes hex-encoded.");
  }
  return publicKey;
}

export function checkSignatureFormat(signature: string): string {
  if (!signature.match(SIGNATURE_REGEX)) {
    throw new TypeError("Signature should be 64 bytes hex-encoded.");
  }
  return signature;
}

export function checkPODName(name?: string): string {
  if (!name) {
    throw new TypeError("POD names cannot be undefined.");
  }
  if (name.match(POD_NAME_REGEX) === null) {
    throw new TypeError(`Invalid POD name "${name}". \
      Only alphanumeric characters and underscores are allowed.`);
  }
  return name;
}

function requireType(
  name: string,
  value: string | bigint,
  typeName: string
): void {
  if (typeof value != typeName) {
    throw new TypeError(
      `Invalid value for entry ${name}.  Expected type ${typeName}.`
    );
  }
}

function checkBigintBounds(
  name: string,
  value: bigint,
  lowerBound: bigint,
  upperBound: bigint
): void {
  if (value < lowerBound || value > upperBound) {
    throw new TypeError(
      `Invalid value for entry ${name}. \
      Value ${value} is outside supported bounds: (min ${lowerBound}, max ${upperBound}).`
    );
  }
}

export function checkPODValue(name: string, podValue?: PODValue): PODValue {
  if (podValue === undefined || podValue.value === undefined) {
    throw new TypeError("POD values cannot be undefined.");
  }
  if (podValue.type === undefined) {
    throw new TypeError("POD values must have a type.");
  }
  switch (podValue.type) {
    case "string":
      requireType(name, podValue.value, "string");
      break;
    case "cryptographic":
      requireType(name, podValue.value, "bigint");
      checkBigintBounds(
        name,
        podValue.value,
        POD_CRYPTOGRAPHIC_MIN,
        POD_CRYPTOGRAPHIC_MAX
      );
      break;
    case "int":
      requireType(name, podValue.value, "bigint");
      checkBigintBounds(name, podValue.value, POD_INT_MIN, POD_INT_MAX);
      break;
    default:
      throw new TypeError(
        `Unknown POD value type ${(podValue as PODValue).type}`
      );
  }
  return podValue;
}

export function isPODNumericValue(podValue: PODValue): boolean {
  return getPODValueForCircuit(podValue) !== undefined;
}

export function getPODValueForCircuit(podValue: PODValue): bigint | undefined {
  switch (podValue.type) {
    case "string":
      return undefined;
    case "int":
    case "cryptographic":
      return podValue.value;
  }
}

export function clonePODValue(podValue: PODValue): PODValue {
  // TODO(artwyman): When we support containers as values, this will have
  // to become more complex.
  return { ...podValue };
}

export function cloneOptionalPODValue(
  podValue: PODValue | undefined
): PODValue | undefined {
  if (podValue === undefined) {
    return undefined;
  }
  return clonePODValue(podValue);
}

export function clonePODEntries(entries: PODEntries): PODEntries {
  const newEntries: PODEntries = {};
  for (const [entryName, entryValue] of Object.entries(entries)) {
    newEntries[entryName] = clonePODValue(entryValue);
  }
  return newEntries;
}

export function serializePODEntries(entries: PODEntries): string {
  return JSONBig({
    useNativeBigInt: true,
    alwaysParseAsBig: true
  }).stringify(entries);
}

export function deserializePODEntries(serializedEntries: string): PODEntries {
  return JSONBig({
    useNativeBigInt: true,
    alwaysParseAsBig: true
  }).parse(serializedEntries);
}
