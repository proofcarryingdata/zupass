import { checkPODValue, PODValue } from "@pcd/pod";
import { PodspecBaseIssue } from "./error";

export type ParseResult<T> = ParseSuccess<T> | ParseFailure;

export type ParseSuccess<T> = { isValid: true; value: T };
export type ParseFailure = { isValid: false; issues: PodspecBaseIssue[] };

export const FAILURE = (issues: PodspecBaseIssue[]): ParseFailure => ({
  isValid: false,
  issues
});
export const SUCCESS = <T>(value: T): ParseResult<T> => ({
  isValid: true,
  value
});

export enum ParsedType {
  string = "string",
  number = "number",
  boolean = "boolean",
  array = "array",
  object = "object",
  null = "null",
  undefined = "undefined",
  PODStringValue = "PODStringValue",
  PODIntValue = "PODIntValue",
  PODCryptographicValue = "PODCryptographicValue",
  PODEdDSAPubKeyValue = "PODEdDSAPubKeyValue",
  BadPODValue = "BadPODValue",
  unknown = "unknown"
}

export function getParsedType(data: unknown): ParsedType {
  if (typeof data === "string") {
    return ParsedType.string;
  }
  if (typeof data === "number") {
    return ParsedType.number;
  }
  if (typeof data === "boolean") {
    return ParsedType.boolean;
  }
  if (Array.isArray(data)) {
    return ParsedType.array;
  }
  if (typeof data === "object" && data !== null) {
    try {
      if ("type" in data && "value" in data) {
        const podValue = checkPODValue("", data as PODValue);
        if (podValue.type === "string") {
          return ParsedType.PODStringValue;
        }
        if (podValue.type === "int") {
          return ParsedType.PODIntValue;
        }
        if (podValue.type === "cryptographic") {
          return ParsedType.PODCryptographicValue;
        }
        if (podValue.type === "eddsa_pubkey") {
          return ParsedType.PODEdDSAPubKeyValue;
        }
        return ParsedType.BadPODValue;
      }
    } catch (e) {
      return ParsedType.object;
    }
  }
  if (data === null) {
    return ParsedType.null;
  }
  if (typeof data === "undefined") {
    return ParsedType.undefined;
  }
  return ParsedType.unknown;
}

export function isValid<T>(result: ParseResult<T>): result is ParseSuccess<T> {
  return result.isValid;
}

export type ParsePathComponent = string;
export type ParsePath = ParsePathComponent[];

export interface ParseParams {
  path: ParsePath;
}

export class ParseStatus {
  value: "valid" | "invalid" = "valid";
}
