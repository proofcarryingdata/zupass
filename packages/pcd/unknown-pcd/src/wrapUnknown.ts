import { SerializedPCD } from "@pcd/pcd-types";
import JSONBig from "json-bigint";
import { v5 as uuidv5 } from "uuid";
import { UnknownPCD } from "./UnknownPCD";

/**
 * Wraps the given serialized PCD in an UnknownPCD, with an ID derived
 * via a best-effort attempt to determine the original ID, or a stable
 * ID (see {@link derivePCDID}).
 *
 * @param serialized the serialized PCD to examine
 * @param error the error from deserialization, if any
 * @returns an UnknownPCD containing the given PCD in its claims
 */
export function wrapUnknownPCD(
  serialized: SerializedPCD,
  error?: unknown
): UnknownPCD {
  return new UnknownPCD(derivePCDID(serialized), serialized, error);
}

export const PCD_ID_MAX_LENGTH = 1024;
export const UNKNOWN_PCD_NAMESPACE_UUID =
  "68a4fb89-b625-4c72-8069-498e6d1df77c";

/**
 * Make a best-effort attempt to derive the best PCD ID for the given
 * serialized PCD.  If the original ID of the serialized PCD can be
 * determined, it will be returned, but otherwise this function will
 * still always return the same ID if given the same serialized contents.
 *
 * The ID returned may be based on examining the serialized data, though
 * any errors in doing so will be ignored since it's assumed that the
 * serialized form may be malformed.
 *
 * @param serialized the serialized PCD to examine
 * @returns a stable ID for this PCD
 */
export function derivePCDID(serialized: SerializedPCD): string {
  try {
    // Attempt to parse as JSON, or JSONBig (which is a superset) and look
    // for an id field.  This could be relevant the PCD parsing failed due to
    // specific fields, not the JSON format.
    const deserialized = JSONBig({
      useNativeBigInt: true
    }).parse(serialized.pcd);

    // If we find a valid ID, use it if it's not unreasonably large.  IDs have
    // to be strings, but don't have to be formated as UUIDs, so we don't parse
    // beyond the type.
    if (
      typeof deserialized.id === "string" &&
      deserialized.id.length <= PCD_ID_MAX_LENGTH
    ) {
      return deserialized.id;
    }

    // No ID found.  Fallthrough to generate a new stable ID.
  } catch (e) {
    // Parsing failed.  Fallthrough to generate a new stable ID.
  }

  // Generate stable ID based on a hash of the serialized PCD.
  return uuidv5(JSON.stringify(serialized), UNKNOWN_PCD_NAMESPACE_UUID);
}
