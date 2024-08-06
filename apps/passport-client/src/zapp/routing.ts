import { ZodSchema } from "zod";
import { StateContextValue } from "../dispatch";

export type Router<T> = {
  [K in keyof T]: T[K] extends (
    input: infer P extends object,
    context: RouteContext
  ) => infer R
    ? RouteDefinition<P, R>
    : Router<T[K]>;
};

interface RouteContext {
  context: StateContextValue;
  path: string;
}

type RouteDefinition<P extends object, R> = {
  auth: (input: P, context: RouteContext) => boolean;
  input: ZodSchema<P>;
  handler: (input: P, context: RouteContext) => R;
};
