/**
 * Either extracts the error message out of an error, or converts
 * the value passed in into a string.
 */
export function getErrorMessage(e: any | Error): string {
  if (e instanceof Error) {
    return e.message;
  }

  return e + "";
}
