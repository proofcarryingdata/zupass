import { PodspecDataType, PodspecDataTypeDef, PodspecValue } from "../base";
import { ParseResult, SUCCESS } from "../parse";
import { DefinitionOf } from "../utils";

/**
 * The definition of an optional Podspec.
 */
interface PodspecOptionalDef<T> extends PodspecDataTypeDef {
  type: PodspecDataType.Optional;
  innerType: T;
}

/**
 * The serialized form of an optional Podspec.
 */
interface PodspecOptionalSerialized<T> {
  type: PodspecDataType.Optional;
  innerTypeDef: DefinitionOf<T>;
}

/**
 * A Podspec type for an optional value.
 *
 * Optional values represent entries which may be missing from a POD without
 * invalidating the POD. {@link PODEntries} does not support a concept of
 * optional or undefined entries, so if no value is provided for an optional
 * entry then it will be entirely omitted from the output.
 */
export class PodspecOptional<T extends PodspecValue> extends PodspecValue<
  // The definition of the optional Podspec.
  PodspecOptionalDef<T>,
  // The type of the value that the optional Podspec outputs, derived from the inner type.
  T["_output"] | undefined,
  // The type of the value that the optional Podspec accepts, derived from the inner type.
  T["_input"] | undefined,
  // The serialized form of the optional Podspec.
  PodspecOptionalSerialized<T>
> {
  constructor(public readonly innerType: T) {
    super({
      type: PodspecDataType.Optional,
      innerType: innerType
    });
  }

  /**
   * Parses the given data into an optional value. Parsing an undefined value
   * is always successful, but if data is present then parsing is delegated to
   * the inner type.
   *
   * @param data - The data to parse.
   * @returns The parsed optional value, or an issue if the data is invalid.
   */
  _parse(data: unknown): ParseResult<T["_output"] | undefined> {
    if (data === undefined) {
      return SUCCESS(undefined);
    }
    return this.def.innerType._parse(data);
  }

  /**
   * Serializes the optional Podspec to a cloneable object.
   *
   * @returns The serialized optional Podspec
   */
  serialize(): PodspecOptionalSerialized<T> {
    return {
      type: PodspecDataType.Optional,
      innerTypeDef: this.innerType.def as DefinitionOf<T>
    };
  }

  /**
   * Creates a new optional Podspec.
   *
   * @param innerType - The inner type of the optional Podspec.
   * @returns The new optional Podspec.
   */
  static create<T extends PodspecValue>(innerType: T): PodspecOptional<T> {
    return new PodspecOptional(innerType);
  }
}
