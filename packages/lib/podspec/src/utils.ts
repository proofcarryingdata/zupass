import { PODValue } from "@pcd/pod";
import { PodspecValue } from "./base";
import { RawEntriesType } from "./entries";

export type DefinitionOf<T> = T extends PodspecValue<infer Def> ? Def : never;

export function assertUnreachable(_: never, message?: string): never {
  throw new Error(message ?? "Unreachable");
}

export function isEqualPODValue(a: PODValue, b: PODValue): boolean {
  return a.type === b.type && a.value === b.value;
}

export interface CreateArgs<C> {
  coerce?: boolean;
  checks?: C[];
}

export type BaseObjectOutputType<Shape extends RawEntriesType> = {
  [k in keyof Shape]: Shape[k]["_output"];
};

type optionalKeys<T extends object> = {
  [k in keyof T]: undefined extends T[k] ? k : never;
}[keyof T];
type requiredKeys<T extends object> = {
  [k in keyof T]: undefined extends T[k] ? never : k;
}[keyof T];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AddQuestionMarks<T extends object, _O = any> = {
  [K in requiredKeys<T>]: T[K];
} & {
  [K in optionalKeys<T>]?: T[K];
} & { [k in keyof T]?: unknown };

export type identity<T> = T;
export type Flatten<T> = identity<{ [k in keyof T]: T[k] }>;

export type objectOutputType<Shape extends RawEntriesType> = Flatten<
  AddQuestionMarks<BaseObjectOutputType<Shape>>
>;

export type baseObjectOutputType<Shape extends RawEntriesType> = {
  [k in keyof Shape]: Shape[k]["_output"];
};
