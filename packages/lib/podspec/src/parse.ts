export type ParseResult<T> = ParseSuccess<T> | ParseFailure;

export type ParseSuccess<T> = { status: "valid"; value: T };
export type ParseFailure = { status: "invalid" };

export const FAILURE: ParseFailure = Object.freeze({ status: "invalid" });
export const SUCCESS = <T>(value: T): ParseResult<T> => ({
  status: "valid",
  value
});

export function isValid<T>(result: ParseResult<T>): result is ParseSuccess<T> {
  return result.status === "valid";
}
