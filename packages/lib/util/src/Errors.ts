/**
 * Either extracts the error message out of an error, or converts
 * the value passed in into a string.
 */
export function getErrorMessage(e: unknown | Error): string {
  if (e instanceof Error) {
    return e.message;
  }

  return e + "";
}

/**
 * Check if a parameter is defined. If not, it throws an error.
 * @param parameter Parameter to be checked.
 * @param parameterName Name of the parameter.
 */
export function requireDefinedParameter(
  parameter: unknown,
  parameterName: string
): void {
  if (typeof parameter === "undefined") {
    throw new Error(`${parameterName} must be defined`);
  }
}
