import { PODValue } from "@pcd/pod";
import { uuidToBigInt } from "@pcd/util";
import {
  PODPipelineInputFieldType,
  PODPipelinePODEntry
} from "../genericIssuanceTypes";
import { FieldTypeToValue, TemplatedColumn } from "./Input";

/**
 * Conversions for converting input values to POD values.
 * If no valid conversion exists, the conversion is set to undefined.
 * This conversion happens *after* the raw values from the CSV file are
 * coerced to the correct type by the CSVInput class.
 */
export const conversions: Record<
  PODPipelinePODEntry["type"],
  {
    [K in PODPipelineInputFieldType]:
      | ((value: FieldTypeToValue<K>) => PODValue)
      | undefined;
  }
> = {
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
    // UUIDs have a special conversion to a bigint.
    [PODPipelineInputFieldType.UUID]: (value) => ({
      type: "int",
      value: uuidToBigInt(value)
    }),
    // Strings cannot be integers
    [PODPipelineInputFieldType.String]: undefined
  },
  cryptographic: {
    // Identical to "int" conversions.
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
    [PODPipelineInputFieldType.UUID]: (value) => ({
      type: "int",
      value: uuidToBigInt(value)
    }),
    [PODPipelineInputFieldType.String]: undefined
  }
};

/**
 * Get a function that converts an input value to a POD value.
 * If no conversion is possible, the function returns undefined.
 *
 * @param column The column to convert.
 * @param podValueType The type of POD value to convert to.
 * @returns A function that converts an input value to a POD value, or undefined if no conversion is possible.
 */
export function getInputToPODValueConverter<
  T extends PODPipelineInputFieldType
>(
  column: TemplatedColumn<T>,
  podValueType: PODPipelinePODEntry["type"]
): ((value: FieldTypeToValue<T>) => PODValue) | undefined {
  return conversions[podValueType]?.[column.type];
}
