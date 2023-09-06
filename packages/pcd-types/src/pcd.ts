export interface PCD<C = unknown, P = unknown> {
  id: string;
  type: string;
  claim: C;
  proof: P;
}

export interface SerializedPCD<_T extends PCD = PCD> {
  type: string;
  pcd: string;
}

/**
 * This interface can be optionally returned by the package ƒor any given
 * PCD, which allows the package some degree of control over how the PCD
 * is displayed in the passport application.
 */
export interface DisplayOptions {
  /**
   * Shown to the user in the main page of the passport, where they can
   * see all of their cards. If `header` is undefined, the passport will use
   * `renderCardBody` with `returnHeader` set to true.
   */
  header?: string;

  /**
   * Shown to the user in the `GenericProveScreen`, allowing them to
   * disambiguate between different pcds of the same type. In the future,
   * we'll have a better way to disambiguate between them.
   */
  displayName?: string;
}

export interface PCDPackage<C = any, P = any, A = any, I = any> {
  name: string;
  getDisplayOptions?: (pcd: PCD<C, P>) => DisplayOptions;
  renderCardBody?: ({
    pcd,
    returnHeader
  }: {
    pcd: PCD<C, P>;
    returnHeader?: boolean;
  }) => React.ReactElement;
  init?: (initArgs: I) => Promise<void>;
  prove(args: A): Promise<PCD<C, P>>;
  verify(pcd: PCD<C, P>): Promise<boolean>;
  serialize(pcd: PCD<C, P>): Promise<SerializedPCD<PCD<C, P>>>;
  deserialize(seralized: string): Promise<PCD<C, P>>;
}

export type ArgsOf<T> = T extends PCDPackage<any, any, infer U, any> ? U : T;
export type PCDOf<T> = T extends PCDPackage<infer C, infer P, any, any>
  ? PCD<C, P>
  : T;

export enum ArgumentTypeName {
  String = "String",
  Number = "Number",
  BigInt = "BigInt",
  Boolean = "Boolean",
  Object = "Object",
  StringArray = "StringArray",
  PCD = "PCD",
  Unknown = "Unknown"
}

export interface Argument<
  TypeName extends ArgumentTypeName,
  ValueType = unknown
> {
  argumentType: TypeName;
  value?: ValueType;
  remoteUrl?: string;
  userProvided?: boolean;
  description?: string;
}

export type StringArgument = Argument<ArgumentTypeName.String, string>;
export function isStringArgument(
  arg: Argument<any, unknown>
): arg is StringArgument {
  return arg.argumentType === ArgumentTypeName.String;
}

export type NumberArgument = Argument<ArgumentTypeName.Number, string>;
export function isNumberArgument(
  arg: Argument<any, unknown>
): arg is NumberArgument {
  return arg.argumentType === ArgumentTypeName.Number;
}

export type BigIntArgument = Argument<ArgumentTypeName.BigInt, string>;
export function isBigIntArgument(
  arg: Argument<any, unknown>
): arg is BigIntArgument {
  return arg.argumentType === ArgumentTypeName.BigInt;
}

export type BooleanArgument = Argument<ArgumentTypeName.Boolean, boolean>;
export function isBooleanArgument(
  arg: Argument<any, unknown>
): arg is BooleanArgument {
  return arg.argumentType === ArgumentTypeName.Boolean;
}

export type ObjectArgument<T> = Argument<ArgumentTypeName.Object, T>;
export function isObjectArgument(
  arg: Argument<any, unknown>
): arg is ObjectArgument<unknown> {
  return arg.argumentType === ArgumentTypeName.Object;
}

export type StringArrayArgument = Argument<
  ArgumentTypeName.StringArray,
  string[]
>;
export function isStringArrayArgument(
  arg: Argument<any, unknown>
): arg is StringArrayArgument {
  return arg.argumentType === ArgumentTypeName.StringArray;
}

export type PCDArgument<T extends PCD = PCD> = Argument<
  ArgumentTypeName.PCD,
  SerializedPCD<T>
> & {
  pcdType?: string;
};
export function isPCDArgument(arg: Argument<any, unknown>): arg is PCDArgument {
  return arg.argumentType === ArgumentTypeName.PCD;
}
