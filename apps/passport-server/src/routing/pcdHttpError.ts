import { Response } from "express";

/**
 * Throw an instance of this error in server application within an express
 * request handler to to return a custom status code, and optionally a custom
 * error message.
 */
export class PCDHTTPError extends Error {
  public readonly code: number;

  public constructor(code: number, message?: string, options?: ErrorOptions) {
    super(message, options);
    this.code = code;
  }
}

/**
 * Throw an instance of this error in server application within an express
 * request handler to to return a custom status code, and optionally an object
 * that is returned a JSON response.
 */
export class PCDHTTPJSONError extends Error {
  public readonly code: number;
  public readonly json?: object;

  public constructor(code: number, json?: object, options?: ErrorOptions) {
    super(JSON.stringify(json), options);
    this.code = code;
    this.json = json;
  }
}

/**
 * If {@link e} is an instance of {@link PCDHTTPError}, returns with the error code
 * and message specified in the error.
 *
 * If no message is provided within the {@link PCDHTTPError}, returns the default message
 * for that http status code.
 *
 * If {@link e} is not an {@link PCDHTTPError}, returns with a generic 500 server error.
 */
export function respondWithError(
  e: PCDHTTPError | PCDHTTPJSONError | Error | unknown,
  res: Response
): void {
  if (e instanceof PCDHTTPError) {
    if (!e.message) {
      res.sendStatus(e.code);
    } else {
      res.type("text").status(e.code).send(e.message);
    }
  } else if (e instanceof PCDHTTPJSONError) {
    res.status(e.code).json(e.json);
  } else {
    res.sendStatus(500);
  }
}
