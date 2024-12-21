import validator from "email-validator";

/**
 * Normalizes email so that equivalent emails can be compared.
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Returns whether or not the parameter is an email address.
 */
export function validateEmail(email: string): boolean {
  return validator.validate(email);
}

/**
 * Converts `{ a: { b: "c" }, d: "e", f: { } }`
 * Into:
 * ```
 * [
 *   ["a.b": "c"],
 *   ["d": "3"]
 * ]
 * ```
 */
export function flattenObject(
  obj: object | undefined
): Array<[string, string]> {
  if (obj === undefined || obj === null) {
    return [];
  }

  let res: Array<[string, string]> = [];
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "string" || typeof v === "number") {
      res.push([k, v + ""]);
    } else {
      const flattenedChild: Array<[string, string]> = flattenObject(v).map(
        ([ck, cv]) => [k + "." + ck, cv]
      );
      res = [...res, ...flattenedChild];
    }
  }

  return res;
}

/**
 * Shorthand for `JSON.stringify`
 */
export function str(val: unknown): string {
  return JSON.stringify(val, null, 2);
}

/**
 * Formats a duration of milliseconds into hh:mm:ss.
 */
export function fmtDuration(totalMs: number): string {
  const sec_num = Math.floor(totalMs / 1000);
  const hours = Math.floor(sec_num / 3600);
  const minutes = Math.floor((sec_num - hours * 3600) / 60);
  const seconds = sec_num - hours * 3600 - minutes * 60;

  let hoursFmt = hours + "";
  let minutesFmt = minutes + "";
  let secondsFmt = seconds + "";

  if (hours < 10) {
    hoursFmt = "0" + hours;
  }
  if (minutes < 10) {
    minutesFmt = "0" + minutes;
  }
  if (seconds < 10) {
    secondsFmt = "0" + seconds;
  }
  return hoursFmt + ":" + minutesFmt + ":" + secondsFmt;
}

/**
 * Converts an empty string to undefined, while passing other argument
 * values through unmodified.
 */
export function emptyStrToUndefined(
  inStr: string | undefined
): string | undefined {
  if (inStr === "") {
    return undefined;
  }
  return inStr;
}

export function tryParse<T>(str: unknown): T | undefined {
  try {
    return JSON.parse(str as string);
  } catch {
    return undefined;
  }
}
