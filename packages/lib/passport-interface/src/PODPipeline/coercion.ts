import { z } from "zod";

const datelike = z.union([z.number(), z.string(), z.date()]);
export const inputToDate = datelike.pipe(z.coerce.date());

const booleanLike = z.union([z.boolean(), z.string(), z.number()]);
export const inputToBoolean = booleanLike.transform((val, ctx) => {
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
