import {
  PODPipelineInputFieldType,
  PODPipelinePODEntry,
  PODPipelineSupportedPODValueTypes
} from "@pcd/passport-interface";
import { PODValue } from "@pcd/pod";
import { uuidToBigInt } from "@pcd/util";
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
type SupportedPODValueType = PODPipelineSupportedPODValueTypes;

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
    [PODPipelineInputFieldType.Int]: (value) => ({
      type: "string",
      value: value.toString()
    }),
    [PODPipelineInputFieldType.Cryptographic]: (value) => ({
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
    }),
    [PODPipelineInputFieldType.EdDSAPubKey]: (value) => ({
      type: "string",
      value: value
    })
  },
  int: {
    // Integers, dates, and booleans can be typed as integers.
    [PODPipelineInputFieldType.Int]: (value) => ({
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
    [PODPipelineInputFieldType.String]: undefined,
    // Cryptographic values do not respect the same bounds as ints
    [PODPipelineInputFieldType.Cryptographic]: undefined,
    [PODPipelineInputFieldType.EdDSAPubKey]: undefined
  },
  cryptographic: {
    // Cryptographic values are less restricted than integers.
    [PODPipelineInputFieldType.Int]: (value) => ({
      type: "cryptographic",
      value: value
    }),
    [PODPipelineInputFieldType.Cryptographic]: (value) => ({
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
    [PODPipelineInputFieldType.String]: undefined,
    [PODPipelineInputFieldType.EdDSAPubKey]: undefined
  },
  eddsa_pubkey: {
    // EdDSA public keys are always represented as strings
    [PODPipelineInputFieldType.String]: undefined,
    [PODPipelineInputFieldType.Int]: undefined,
    [PODPipelineInputFieldType.Cryptographic]: undefined,
    [PODPipelineInputFieldType.Date]: undefined,
    [PODPipelineInputFieldType.Boolean]: undefined,
    [PODPipelineInputFieldType.UUID]: undefined,
    [PODPipelineInputFieldType.EdDSAPubKey]: (value) => ({
      type: "eddsa_pubkey",
      value: value
    })
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
