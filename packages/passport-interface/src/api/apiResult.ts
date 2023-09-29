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
  | { value?: never; error: TError; success: false };

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
