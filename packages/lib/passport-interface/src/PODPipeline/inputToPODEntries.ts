import { PODValue } from "@pcd/pod";
import { uuidToBigInt } from "@pcd/util";
import {
  PODPipelineInputFieldType,
  PODPipelinePODEntry
} from "../genericIssuanceTypes";
import { FieldTypeToJavaScriptType } from "./Input";

/**
 * Conversions for converting input values to POD values.
 * If no valid conversion exists, the conversion is set to undefined.
 * This conversion happens *after* the raw values from the CSV file are
 * coerced to the correct type by the CSVInput class.
 *
 * This maps from supported POD value types (not all value types are supported
 * yet) to the input types that can be converted to them. Input types are
 * described by {@link PODPipelineInputFieldType}.
 */
type SupportedPODValueType = Exclude<PODValue["type"], "eddsa_pubkey">;

type Conversions = {
  [P in SupportedPODValueType]: {
    [T in PODPipelineInputFieldType]?: (
      input: FieldTypeToJavaScriptType<T>
    ) => PODValue;
  };
};

const PODValueConversions: Conversions = {
  // String conversions are simple, anything can be made into a string.
  string: {
    [PODPipelineInputFieldType.String]: (value) => ({
      type: "string",
      value: value
    }),
    [PODPipelineInputFieldType.Integer]: (value) => ({
      type: "string",
      value: value.toString()
    }),
    [PODPipelineInputFieldType.Date]: (value) => ({
      type: "string",
      value: value.toISOString()
    }),
    [PODPipelineInputFieldType.Boolean]: (value) => ({
      type: "string",
      value: value.toString()
    }),
    [PODPipelineInputFieldType.UUID]: (value) => ({
      type: "string",
      value: value
    })
  },
  int: {
    // Most things can be integers, except strings.
    // If the input data contains numeric strings, then the input data should
    // be typed as an integer!
    [PODPipelineInputFieldType.Integer]: (value) => ({
      type: "int",
      value: value
    }),
    [PODPipelineInputFieldType.Date]: (value) => ({
      type: "int",
      value: BigInt(value.getTime())
    }),
    [PODPipelineInputFieldType.Boolean]: (value) => ({
      type: "int",
      value: BigInt(value)
    }),
    // UUIDs are too big to fit into a POD integer.
    [PODPipelineInputFieldType.UUID]: undefined,
    // Strings cannot be integers.
    [PODPipelineInputFieldType.String]: undefined
  },
  cryptographic: {
    // We can directly convert integers to "cryptographic" values.
    // Integers are constrained by the bounds of the POD integer type.
    // Not clear if there's a use-case for CSV uploads containing cryptographic
    // values, which would require another field type to be added.
    [PODPipelineInputFieldType.Integer]: (value) => ({
      type: "cryptographic",
      value: value
    }),
    [PODPipelineInputFieldType.Date]: (value) => ({
      type: "cryptographic",
      value: BigInt(value.getTime())
    }),
    [PODPipelineInputFieldType.Boolean]: (value) => ({
      type: "cryptographic",
      value: BigInt(value)
    }),
    // UUIDs have a special conversion function, as used for converting ticket
    // IDs to bigints in our earlier code.
    [PODPipelineInputFieldType.UUID]: (value) => ({
      type: "cryptographic",
      value: uuidToBigInt(value)
    }),
    [PODPipelineInputFieldType.String]: undefined
  }
} as const;

/**
 * Get a function that converts an input value to a POD value.
 * If no conversion is possible, the function returns undefined.
 *
 * @param inputType The input type to convert.
 * @param podValueType The type of POD value to convert to.
 * @returns A function that converts an input value to a POD value, or undefined if no conversion is possible.
 */
export function getInputToPODValueConverter<
  T extends PODPipelineInputFieldType
>(
  inputType: T,
  podValueType: PODPipelinePODEntry["type"]
): ((value: FieldTypeToJavaScriptType<T>) => PODValue) | undefined {
  return PODValueConversions[podValueType]?.[inputType];
}
