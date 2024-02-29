import {
  PODValue,
  POD_CRYPTOGRAPHIC_MAX,
  POD_CRYPTOGRAPHIC_MIN,
  POD_INT_MAX,
  POD_INT_MIN,
  POD_NAME_REGEX
} from "./podTypes";

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
  if (podValue === undefined || podValue.value === undefined) {
    throw new Error("POD values cannot be undefined.");
  }
  if (podValue.type === undefined) {
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
