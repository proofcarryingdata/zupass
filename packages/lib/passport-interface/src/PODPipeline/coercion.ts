import { z } from "zod";

// Zod will coerce many kinds of things to Dates, including nulls. This
// two-step coercion first ensures that we have either a string or a date,
// and only then will it attempt to coerce the data into a Date object.
const datelike = z.union([z.string(), z.date()]);
export const inputToDate = datelike.pipe(z.coerce.date());

// Similarly, Zod has very permissive parsing for Boolean values.
// We want to match certain strings as True, and certain other strings as
// False, with any unmatched values being invalid. Empty strings are False.
export const inputToBoolean = z.string().transform((val, ctx) => {
  if (typeof val === "boolean") return val;
  if (typeof val === "number") return val !== 0;
  const normalized = val.toLowerCase().trim();
  if (["true", "t", "yes", "y", "1"].includes(normalized)) return true;
  if (["false", "f", "no", "n", "0", ""].includes(normalized)) return false;
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    message: "Invalid boolean value"
  });
  return z.NEVER;
});

// Zod's native BigInt conversion can throw exceptions, which we do not want,
// and so we wrap the conversion and return a custom error if an exception
// occurs.
export const inputToBigInt = z.string().transform((val, ctx) => {
  try {
    return BigInt(val);
  } catch (error) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Invalid BigInt value",
      fatal: true
    });
    return z.NEVER;
  }
});
