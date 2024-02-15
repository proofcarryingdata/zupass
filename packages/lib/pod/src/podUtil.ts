import { r as BabyJubjubR } from "@zk-kit/baby-jubjub";
import { PODEntries, PODMap, PODValue } from "./pod";

export const POD_NAME_REGEX = new RegExp(/^\w+$/);

export const POD_CRYPTOGRAPHIC_MIN = 0n;
export const POD_CRYPTOGRAPHIC_MAX = BabyJubjubR - 1n;

// TODO(artwyman): Decide on default int bounds and sign for POD.
export const POD_INT_MIN = 0n;
export const POD_INT_MAX = (1n << 64n) - 1n;

export function checkPODName(name?: string): string {
  if (!name) {
    throw new Error("POD names cannot be undefined.");
  }
  if (name.match(POD_NAME_REGEX) === null) {
    throw new Error(`Invalid POD name "${name}". \
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
    throw new Error(
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
    throw new Error(
      `Invalid value for entry ${name}. \
      Value ${value} is outside supported bounds: (min ${lowerBound}, max ${upperBound}).`
    );
  }
}

export function checkPODValue(name: string, podValue?: PODValue): PODValue {
  if (!podValue || !podValue.value) {
    throw new Error("POD values cannot be undefined.");
  }
  if (!podValue.type) {
    throw new Error("POD values must have a type.");
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
      throw new Error(`Unknown POD value type ${(podValue as PODValue).type}`);
  }
  return podValue;
}

export function makePODMap(entries: PODEntries): PODMap {
  const sortedNames = Object.keys(entries)
    .map((name) => checkPODName(name))
    .sort();
  const podMap: PODMap = new Map();
  for (const name of sortedNames) {
    podMap.set(name, checkPODValue(name, entries[name]));
  }
  return podMap;
}
