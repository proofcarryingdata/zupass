import { Request } from "express";
import { PCDHTTPError } from "./pcdHttpError";

/**
 * Extracts a string value from the query of an Express {@link Request}.
 * If the value doesn't exist, throws a {@link PCDHTTPError}.
 */
export function checkQueryParam(req: Request, paramName: string): string {
  const value = req.query[paramName];

  if (typeof value !== "string") {
    throw new PCDHTTPError(
      400,
      `missing required query parameter '${paramName}' - was ${value}`
    );
  }

  return decodeURIComponent(value);
}

/**
 * Extracts an optional string value from the query of an Express
 * {@link Request}.  If the value is missing, return undefined.  If the value is
 * not a string, throws a {@link PCDHTTPError}.
 */
export function checkOptionalQueryParam(
  req: Request,
  paramName: string
): string | undefined {
  const value = req.query[paramName];

  if (typeof value === "undefined") {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new PCDHTTPError(
      400,
      `missing required query parameter '${paramName}' - was ${value}`
    );
  }

  return decodeURIComponent(value);
}

/**
 * Extracts a string value from the url params of an Express {@link Request}.
 * If the value doesn't exist or is not a string, throws a
 * {@link PCDHTTPError}.
 */
export function checkUrlParam(req: Request, paramName: string): string {
  const value = req.params[paramName];

  if (typeof value !== "string") {
    throw new PCDHTTPError(
      400,
      `missing required url path parameter '${paramName}' - was ${value}`
    );
  }

  return decodeURIComponent(value);
}

/**
 * Extracts an optional string value from the url params of an Express
 * {@link Request}.  If the value is missing, return undefined.  If the value is
 * not a string, throws a {@link PCDHTTPError}.
 */
export function checkOptionalUrlParam(
  req: Request,
  paramName: string
): string | undefined {
  const value = req.params[paramName];

  if (typeof value === "undefined") {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new PCDHTTPError(
      400,
      `missing required url path parameter '${paramName}' - was ${value}`
    );
  }

  return decodeURIComponent(value);
}

/**
 * Extracts a javascript value from the request body of a {@link Request}.
 * If the value is `null` or `undefined`, throws an error.
 *
 * @todo - better way to do this?
 */
export function checkBody<T, U extends keyof T>(
  req: Request,
  name: U
): NonNullable<T[U]> {
  const value = req.body[name];

  if (value === null || value === undefined) {
    throw new PCDHTTPError(
      400,
      `missing required request body field: '${String(name)}' - was ${value}`
    );
  }

  return value;
}
