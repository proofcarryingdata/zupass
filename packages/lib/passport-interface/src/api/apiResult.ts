/**
 * When we call the Zupass server, we encapsulate the result in a
 * {@link APIResult}. HTTP requests to the Zupass server never throw
 * exceptions or reject promises - all possible results are encoded
 * in this type.
 */
export type APIResult<TResult = unknown, TError = string> =
  | {
      value: TResult;
      error?: never;
      success: true;
    }
  | { value?: never; error: TError; success: false; code?: number };

/**
 * Given the string result an HTTP endpoint responds with, return
 * an {@link APIResult}.
 */
export type GetResultValue<T extends APIResult<unknown, unknown>> = (
  resText: string
) => Promise<T>;

/**
 * In the case that an HTTP endpoint throws an error, responds with
 * anything other than a 200 status code, or in the case that a sibling
 * {@link GetResultValue} throws an error/rejects, this function will
 * return an {@link APIResult} representing a 'failure' or 'error' state.
 */
export type GetError<T extends APIResult<unknown, unknown>> = (
  resText: string,
  errorCode?: number | undefined
) => Promise<T>;

/**
 * Used to convert an HTTP response into a statically-typed and
 * non-rejected {@link APIResult}.
 */
export type ResultMapper<T extends APIResult<unknown, unknown>> = {
  onValue: GetResultValue<T>;
  onError: GetError<T>;
};

/**
 * Convenience type for errors which have a machine-readable name which
 * can be provided by the server, or produced by the API layer
 */
export interface NamedAPIError {
  name: string;
  detailedMessage?: string;
  code?: number;
}

/**
 * Format a user-readable error message from a NamedAPIError instance.
 */
export function getNamedAPIErrorMessage(e: NamedAPIError): string {
  if (e.detailedMessage) {
    return e.name + ": " + e.detailedMessage;
  } else {
    return e.name;
  }
}

/**
 * Default value for `NamedAPIError.name` for cases when a more
 * specific name cannot be determined.
 */
export const ERROR_NAME_UNKNOWN = "Unknown";

/**
 * Value for `NamedAPIError.name` for cases where a client-side check
 * indicates the server didn't respond properly.
 */
export const ERROR_NAME_BAD_RESPONSE = "BadResponse";

/**
 * Helper function which can be used directly in the `onError` field of a
 * ResultMapper to produce an error type of NamedAPIError.  This
 * can handle server-provided errors which conform to the right type, as well
 * as server or local errors which do not.
 *
 * This function will allow the server to specify error contents via
 * an `error` field in the resulting JSON.  Fields which aren't provided
 * by the server (or which aren't the expected type) will be filled in by
 * this function instead.  Unknown fields from the server will be passed
 * through unmodified.
 *
 * The APIResult returned is always an error with `success===false`.  The
 * result type here is only a placeholder.
 */
export async function onNamedAPIError<TResult>(
  resText: string,
  errorCode: number | undefined
): Promise<APIResult<TResult, NamedAPIError>> {
  // If server gives us valid JSON, parse it for potential encoded error.
  let apiError: any = {};
  let serverProvidedError = false;
  console.log(resText);
  try {
    const resJSON = JSON.parse(resText);
    // Server must at least specify error.name for us to take its other
    // fields.  If so, we take all fields, but delete any with the wrong type.
    if (resJSON.error?.name && typeof resJSON.error.name == "string") {
      serverProvidedError = true;
      apiError = resJSON.error;
      if (
        "detailedMessage" in apiError &&
        typeof apiError.detailedMessage != "string"
      ) {
        delete apiError.detailedMessage;
      }
      if ("code" in apiError && typeof apiError.code != "number") {
        delete apiError.code;
      }
    } else {
      // If server didn't provide a pre-filled error object, we take the full
      // server text as detailedMessage.
      apiError.detailedMessage = resText;
    }
  } catch (e) {
    // Just continue with serverProvidedError===false
  }

  // If server didn't provide a pre-filled error object, we take the full
  // server text as detailedMessage.
  if (!serverProvidedError) {
    apiError.detailedMessage = resText;
  }

  // If server hasn't already given us an error code, use the local one,
  // which may or may not be an HTTP status code.
  if (apiError.code === undefined && errorCode !== undefined) {
    apiError.code = errorCode;
  }

  // If we got a code (likely HTTP status), we can use it to fill in a missing
  // "name".
  console.log(apiError);
  if (apiError.name === undefined && apiError.code !== undefined) {
    apiError.name = apiErrorReasonFromCode(apiError.code);
  }

  // If we still haven't figured out a name, it is unknown.
  if (apiError.name === undefined) {
    apiError.name = ERROR_NAME_UNKNOWN;
  }

  console.log(apiError);
  return { success: false, error: apiError satisfies NamedAPIError };
}

/**
 * Makes a best effort to pick a useful name code for a given error code.
 * The code is assumed to be an HTTP status code if it matches a known status.
 * This isn't intended to be an exhaustive list of possible code, just
 * a few codes known to be used in our API, which can be extended later.
 */
export function apiErrorReasonFromCode(code: number): string | undefined {
  switch (code) {
    case 400:
      return "BadRequest";
    case 401:
      return "Unauthorized";
    case 403:
      return "Forbidden";
    case 404:
      return "NotFound";
    case 409:
      return "Conflict";
    case 410:
      return "Gone";

    case 500:
      return "InternalServerError";
    case 501:
      return "NotImplemented";
    case 503:
      return "ServiceUnavailable";

    default:
      return undefined;
  }
}
