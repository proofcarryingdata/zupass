export interface PCD<C = unknown, P = unknown> {
  type: string;
  claim: C;
  proof: P;
}

export interface SerializedPCD<T extends PCD = PCD> {
  type: string;
  pcd: string;
}

export interface PCDPackage<C = unknown, P = unknown, A = unknown> {
  name: string;
  prove(args: A): Promise<PCD<C, P>>;
  verify(pcd: PCD<C, P>): Promise<boolean>;
  serialize(pcd: PCD<C, P>): Promise<SerializedPCD>;
  deserialize(seralized: string): Promise<PCD<C, P>>;
}

export interface PCDArguments {
  [name: string]: Argument<any, any>;
}

export interface ArgumentType<T extends ArgumentTypeName, U = unknown> {
  type: T;
  specificType: U;
}

export enum ArgumentTypeName {
  String = "String",
  Number = "Number",
  BigInt = "BigInt",
  Boolean = "Boolean",
  Object = "Object",
  PCD = "PCD",
  Unknown = "Unknown",
}

export interface Argument<
  TypeName extends ArgumentTypeName,
  ValueType = unknown
> {
  argumentType: TypeName;
  value?: ValueType;
  remoteUrl?: string;
  userProvided?: boolean;
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

export type BooleanArgument = Argument<ArgumentTypeName.Boolean, string>;
export function isBooleanArgument(
  arg: Argument<any, unknown>
): arg is BooleanArgument {
  return arg.argumentType === ArgumentTypeName.Boolean;
}

export type ObjectArgument<T> = Argument<ArgumentTypeName.Object, T>;
export function isObjectArgument(
  arg: Argument<any, unknown>
): arg is ObjectArgument<unknown> {
  return arg.argumentType === ArgumentTypeName.Boolean;
}

export type PCDArgument<T extends PCD = PCD> = Argument<
  ArgumentTypeName.PCD,
  SerializedPCD<T>
>;
export function isPCDArgument(arg: Argument<any, unknown>): arg is PCDArgument {
  return arg.argumentType === ArgumentTypeName.PCD;
}
