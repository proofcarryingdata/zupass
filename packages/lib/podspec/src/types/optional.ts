import { PodspecDataType, PodspecDataTypeDef, PodspecValue } from "../base";
import { ParseResult, SUCCESS } from "../parse";
import { DefinitionOf } from "../utils";

interface PodspecOptionalDef<T> extends PodspecDataTypeDef {
  type: PodspecDataType.Optional;
  innerType: T;
}

interface PodspecOptionalSerialized<T> {
  type: PodspecDataType.Optional;
  innerTypeDef: DefinitionOf<T>;
}

export class PodspecOptional<T extends PodspecValue> extends PodspecValue<
  PodspecOptionalDef<T>,
  T["_output"] | undefined,
  T["_input"] | undefined,
  PodspecOptionalSerialized<T>
> {
  constructor(public readonly innerType: T) {
    super({
      type: PodspecDataType.Optional,
      innerType: innerType
    });
  }

  _parse(data: unknown): ParseResult<T["_output"] | undefined> {
    if (data === undefined) {
      return SUCCESS(undefined);
    }
    return this.def.innerType._parse(data);
  }

  serialize(): PodspecOptionalSerialized<T> {
    return {
      type: PodspecDataType.Optional,
      innerTypeDef: this.innerType.def as DefinitionOf<T>
    };
  }

  static create<T extends PodspecValue>(innerType: T): PodspecOptional<T> {
    return new PodspecOptional(innerType);
  }
}
