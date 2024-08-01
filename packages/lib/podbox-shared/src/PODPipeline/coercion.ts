import { PODPipelineInputFieldType } from "@pcd/passport-interface";
import {
  POD_CRYPTOGRAPHIC_MAX,
  POD_CRYPTOGRAPHIC_MIN,
  POD_INT_MAX,
  POD_INT_MIN,
  checkBigintBounds,
  checkPublicKeyFormat
} from "@pcd/pod";
import { getErrorMessage } from "@pcd/util";
import { SafeParseReturnType, z } from "zod";
import { FieldTypeToJavaScriptType } from "./Input";

/**
 * These coercions are used to convert input values from a CSV document into
 * the types that we use in the POD pipeline.
 *
 * These types will subsequently be converted into {@link PODValue}s, but
 * the coercions are separate to allow for easier testing.
 *
 * See {@link getInputToPODValueConverter} to see how coerced values are
 * converted into {@link PODValue}s.
 */

// Zod will coerce many kinds of things to Dates, including nulls. This
// two-step coercion first ensures that we have either a string or a date,
// and only then will it attempt to coerce the data into a Date object.
const datelike = z.union([z.string(), z.date()]);
const inputToDate = datelike.pipe(z.coerce.date());

// Similarly, Zod has very permissive parsing for Boolean values.
// We want to match certain strings as True, and certain other strings as
// False, with any unmatched values being invalid. Empty strings are False.
const inputToBoolean = z.string().transform((val, ctx) => {
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
const inputToBigInt = z.string().transform((val, ctx) => {
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

type Coercers = {
  [K in PODPipelineInputFieldType]: (
    value: unknown
  ) => SafeParseReturnType<unknown, FieldTypeToJavaScriptType<K>>;
};

// Set up a mapping from field types to Zod parsers.
export const coercions: Coercers = {
  [PODPipelineInputFieldType.String]: z.string().safeParse,
  // We use a custom parser for integers because we want to ensure that
  // the value is within the bounds of a POD integer.
  [PODPipelineInputFieldType.Int]: inputToBigInt.refine(
    (arg: bigint) => {
      try {
        checkBigintBounds("int", arg, POD_INT_MIN, POD_INT_MAX);
        return true;
      } catch (error) {
        return false;
      }
    },
    {
      message: "Integer must be between POD_INT_MIN and POD_INT_MAX, inclusive"
    }
  ).safeParse,
  [PODPipelineInputFieldType.Cryptographic]: inputToBigInt.refine(
    (arg: bigint) => {
      try {
        checkBigintBounds(
          "cryptographic",
          arg,
          POD_CRYPTOGRAPHIC_MIN,
          POD_CRYPTOGRAPHIC_MAX
        );
        return true;
      } catch (error) {
        return false;
      }
    },
    {
      message:
        "Cryptographic number must be between POD_CRYPTOGRAPHIC_MIN and POD_CRYPTOGRAPHIC_MAX, inclusive"
    }
  ).safeParse,
  [PODPipelineInputFieldType.Date]: inputToDate.safeParse,
  [PODPipelineInputFieldType.Boolean]: inputToBoolean.safeParse,
  // Since UUIDs may be hashed when treated as strings, we want them to be
  // normalized to lowercase to prevent issues with case sensitivity.
  [PODPipelineInputFieldType.UUID]: z.string().uuid().toLowerCase().safeParse,
  [PODPipelineInputFieldType.EdDSAPubKey]: z
    .string()
    .superRefine((val, ctx) => {
      try {
        checkPublicKeyFormat(val);
      } catch (error) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Invalid EdDSA public key: ${getErrorMessage(error)}`
        });
      }
    }).safeParse
};
