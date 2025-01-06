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
 * If the value is an `Error`, this returns the value. Otherwise, it creates a
 * new `Error` with the stringified value as the message.
 */
export function toError(e: unknown | Error): Error {
  if (e instanceof Error) {
    return e;
  }

  return new Error(e + "");
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

export function isError(err: unknown): err is Error {
  return err instanceof Error;
}

/**
 * Takes an error, and continues yielding errors by tracing the chain of
 * '.cause' properties on the error object.
 * Finally yields a "rootCause" object for Rollbar to log as a custom
 * property.
 */
export function* causalChain(
  err: Error
): Generator<Error | { rootCause: string }> {
  // There's always at least one error
  yield err;

  // While the error has a cause, yield it and see if there's another one
  while (isError(err.cause)) {
    yield err.cause;
    err = err.cause;
  }

  // The message of the last error in the chain is the root cause.
  // This object will get logged as a custom property on the "item"
  // in Rollbar.
  const rootCause = err.message;
  yield { rootCause };
}
