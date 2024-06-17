import {
  PODName,
  PODRawValue,
  POD_NAME_REGEX,
  checkPublicKeyFormat,
  podValueFromRawValue,
  podValueToRawValue
} from "@pcd/pod";
import JSONBig from "json-bigint";
import { GPCPCDPrescribedPODValues } from "./GPCPCD";

const jsonBigSerializer = JSONBig({
  useNativeBigInt: true,
  alwaysParseAsBig: true
});

/**
 * Deserializes `GPCPCDPrescribedPODValues` from the simplified format produced by
 * {@link gpcPCDPrescribedPODValuesToSimplifiedJSON}.  Type information is inferred from
 * the values in a way which should preserve hashing and circuit behavior, but
 * isn't guaranteed to be identical to the types before serialization.  For
 * instance, small numbers are always annotated as `int`, rather than
 * `cryptographic`.
 *
 * @param simplifiedJSON a string representation of `GPCPCDPrescribedPODValues`
 * @returns `GPCPCDPrescribedPODValues` deserialized from the string
 * @throws if the serialized form is invalid
 */
export function gpcPCDPrescribedPODValuesFromSimplifiedJSON(
  simplifiedJSON: string
): GPCPCDPrescribedPODValues {
  const simplifiedValues = jsonBigSerializer.parse(simplifiedJSON) as Record<
    PODName,
    { entries?: Record<PODName, PODRawValue>; signerPublicKey?: string }
  >;

  // Check shape of deserialised string.
  if (
    !(
      // It is a record whose keys are of the right form.
      (
        typeof simplifiedValues === "object" &&
        Object.keys(simplifiedValues).every(
          (key) => key.match(POD_NAME_REGEX) !== null
        ) &&
        // For each of its values,
        Object.values(simplifiedValues).every(
          (podData) =>
            // we should be dealing with an object
            typeof podData === "object" &&
            // containing at least one field,
            Object.keys(podData).length >= 1 &&
            // which should be either of 'entries' or 'signerPublicKey',
            Object.keys(podData).every((key) =>
              ["entries", "signerPublicKey"].includes(key)
            ) &&
            // and the signer's public key is an appropriate string (if
            // specified),
            (podData.signerPublicKey === undefined ||
              (typeof podData.signerPublicKey === "string" &&
                checkPublicKeyFormat(podData.signerPublicKey) ===
                  podData.signerPublicKey)) &&
            // and the entries must form a record mapping strings to raw POD
            // values.
            (podData.entries === undefined ||
              (typeof podData.entries === "object" &&
                Object.keys(podData.entries).every(
                  (key) => typeof key === "string"
                ) &&
                Object.values(podData.entries).every((value) =>
                  ["bigint", "string"].includes(typeof value)
                )))
        )
      )
    )
  ) {
    throw new TypeError(
      `Invalid serialised GPCPCDPrescribedPODValues: ${simplifiedJSON}`
    );
  }

  const prescribedValues = Object.fromEntries(
    Object.entries(simplifiedValues).map(([podName, data]) => [
      podName,
      {
        ...(data.entries !== undefined
          ? {
              entries: Object.fromEntries(
                Object.entries(data.entries).map(([entryName, rawValue]) => [
                  entryName,
                  podValueFromRawValue(rawValue)
                ])
              )
            }
          : {}),
        ...(data.signerPublicKey !== undefined
          ? { signerPublicKey: data.signerPublicKey }
          : {})
      }
    ])
  ) as GPCPCDPrescribedPODValues;

  return prescribedValues;
}

/**
 * Serializes `GPCPCDPrescribedPODValues` to a string in a simplified format optimized
 * for compactness and human readability.  Calling {@link
 * gpcPCDPrescribedPODValuesFromSimplifiedJSON} will reconstruct
 * `GPCPCDPrescribedPODValues` whose POD values will contain the same values and
 * behave the same in hashing and circuits, but the type information may not be
 * identical.
 *
 * @param toSerialize the prescribed values to serialize
 * @param space pretty-printing configuration, as defined by the corresponding
 *   argument to JSON.stringify.
 * @returns a string representation
 */
export function gpcPCDPrescribedPODValuesToSimplifiedJSON(
  toSerialize: GPCPCDPrescribedPODValues,
  space?: number
): string {
  const simplifiedValues: Record<
    PODName,
    { entries?: Record<PODName, PODRawValue>; signerPublicKey?: string }
  > = Object.fromEntries(
    Object.entries(toSerialize).map(([podName, data]) => [
      podName,
      {
        ...(data.entries !== undefined
          ? {
              entries: Object.fromEntries(
                Object.entries(data.entries).map(([entryName, value]) => [
                  entryName,
                  podValueToRawValue(value)
                ])
              )
            }
          : {}),
        ...(data.signerPublicKey !== undefined
          ? { signerPublicKey: data.signerPublicKey }
          : {})
      }
    ])
  );
  return jsonBigSerializer.stringify(simplifiedValues, null, space);
}
