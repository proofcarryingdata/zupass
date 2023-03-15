export interface PCD<C = unknown, P = unknown> {
  type: string;
  claim: C;
  proof: P;
}

export interface SerializedPCD {
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
  [name: string]: Argument;
}

export enum ArgumentType {
  String = "String",
  Number = "Number",
  BigInt = "BigInt",
  Boolean = "Boolean",
  Object = "Object",
  PCD = "PCD",
}

export interface Argument<Type = unknown, ValueType = unknown> {
  type: Type;
  value?: ValueType;
  remoteUrl?: string;
  userProvided?: boolean;
}

export type StringArgument = Argument<string, ArgumentType.String>;
export function isStringArgument(arg: Argument): arg is StringArgument {
  return arg.type === ArgumentType.String;
}

export type NumberArgument = Argument<string, ArgumentType.Number>;
export function isNumberArgument(arg: Argument): arg is NumberArgument {
  return arg.type === ArgumentType.Number;
}

export type BigIntArgument = Argument<string, ArgumentType.BigInt>;
export function isBigIntArgument(arg: Argument): arg is BigIntArgument {
  return arg.type === ArgumentType.BigInt;
}

export type BooleanArgument = Argument<string, ArgumentType.Boolean>;
export function isBooleanArgument(arg: Argument): arg is BooleanArgument {
  return arg.type === ArgumentType.Boolean;
}

export type ObjectArgument<T> = Argument<T, ArgumentType.Object>;
export function isObjectArgument(
  arg: Argument
): arg is ObjectArgument<unknown> {
  return arg.type === ArgumentType.Boolean;
}

export type PCDArgument = Argument<string, ArgumentType.PCD>;
export function isPCDArgument(arg: Argument): arg is PCDArgument {
  return arg.type === ArgumentType.PCD;
}
