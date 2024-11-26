import { PODEntries } from "@pcd/pod";
import { ZodRawShape, ZodSchema } from "zod";

/**
 * Utility functions for converting data described by a Zod schema to
 * {@link PODEntries}. This ought to find a home in another package.
 */

type PotentialBigInt = string | number | bigint | boolean;

/**
 * A no-op "transform" which we can use to flag that a data type ought to be
 * treated as a POD "cryptographic" value.
 */
export function cryptographic<T extends PotentialBigInt>(a?: T): T | undefined {
  return a;
}

/**
 * Converts a public key to a commitment.
 */
export function eddsaPublicKey<T extends string>(a?: T): string | undefined {
  return a;
}

/**
 * Validator that ensures that a value can really be transformed into a BigInt.
 * Only relevant for strings which may contain non-numeric values.
 */
export function canBeBigInt(a: PotentialBigInt): boolean {
  try {
    BigInt(a);
  } catch (_err) {
    return false;
  }
  return true;
}

/**
 * The types of Zod field that can be turned into POD values.
 */
const supportedFieldTypes = [
  "ZodString",
  "ZodNativeEnum",
  "ZodNumber",
  "ZodBoolean",
  "ZodOptional",
  "ZodEffects"
] as const;

/**
 * Turns data into PODEntries, assuming that the data has a Zod schema.
 * Supports only schemas containing the field types listed in
 * {@link supportedFieldTypes}.
 */
export function dataToPodEntries<T>(
  rawData: T,
  schema: ZodSchema,
  shape: ZodRawShape
): PODEntries {
  // First, make sure that the schema can parse the data.
  // Will throw an exception if not.
  const data = schema.parse(rawData);
  const entries: PODEntries = {};

  // Iterate over the schema-described fields. We can be confident that the
  // data object contains these fields, due to having parsed correctly.
  for (const [key, field] of Object.entries(shape)) {
    let typeName = field._def["typeName"];
    // Optional fields wrap other field types. For instance, an Optional that
    // wraps a String is either a String or missing entirely.
    if (typeName === "ZodOptional") {
      // If there's no value for this field, don't add an entry for it.
      if (data[key] === undefined) {
        continue;
      } else {
        typeName = field._def.innerType._def.typeName;
      }
    }
    if (!supportedFieldTypes.includes(typeName)) {
      throw new Error(`Unsupported field type: ${typeName} for key ${key}`);
    }
    // Convert the fields into POD entries based on their Zod type.
    switch (typeName) {
      case "ZodString":
        entries[key] = {
          // Strings become values without any changes.
          value: data[key],
          type: "string"
        };
        break;
      case "ZodNativeEnum":
      case "ZodNumber":
        entries[key] = {
          // NativeEnums and Numbers are numeric, and become BigInts.
          value: BigInt(data[key]),
          type: "int"
        };
        break;
      case "ZodBoolean":
        entries[key] = {
          // Booleans become either 1n (true) or 0n (false).
          value: data[key] ? 1n : 0n,
          type: "int"
        };
        break;
      case "ZodEffects":
        // "ZodEffects" is a field with a transform attached.
        // Right now we only support the "cryptographic" transform, which
        // indicates that this should become a "cryptographic" POD value.
        if (field._def.effect.transform === cryptographic) {
          if (data[key] !== null && data[key] !== undefined) {
            entries[key] = {
              // Cryptographic values are always BigInts.
              value: BigInt(data[key]),
              type: "cryptographic"
            };
          }
        } else if (field._def.effect.transform === eddsaPublicKey) {
          if (data[key] !== null && data[key] !== undefined) {
            entries[key] = {
              value: data[key],
              type: "eddsa_pubkey"
            };
          }
        } else {
          throw new Error(`Unrecognized transform on key ${key}`);
        }
        break;
    }
  }

  // Always add pod_type to allow tickets to be identified.
  entries["pod_type"] = { value: "zupass.ticket", type: "string" };

  return entries;
}
