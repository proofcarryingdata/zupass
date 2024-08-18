import { PodspecDataType, PodspecDataTypeDef, PodspecValue } from "../base";
import { ParseResult } from "../parse";
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
  _parse(_data: unknown): ParseResult<T["_output"] | undefined> {
    throw new Error("Method not implemented.");
  }
  serialize(): PodspecOptionalSerialized<T> {
    throw new Error("Method not implemented.");
  }

  static create<T extends PodspecValue>(
    args: PodspecOptionalDef<T>
  ): PodspecOptional<T> {
    return new PodspecOptional(args);
  }
}
