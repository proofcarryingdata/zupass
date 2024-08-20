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
