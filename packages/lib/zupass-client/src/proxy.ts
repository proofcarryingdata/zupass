import { ZodFunction, ZodObject, ZodRawShape, ZodSchema } from "zod";
import { ZupassAPI } from "./api_internal";
import { invoke } from "./client";

interface ProxyCallbackOptions {
  path: readonly string[];
  args: readonly unknown[];
  proxy: unknown;
}

type ProxyCallback = (opts: ProxyCallbackOptions) => unknown;

function createRecursiveProxy(
  callback: ProxyCallback,
  path: readonly string[],
  root: unknown
): unknown {
  const proxy: unknown = new Proxy(
    () => {
      // dummy no-op function since we don't have any
      // client-side target we want to remap to
    },
    {
      get(_obj, key): unknown {
        if (typeof key !== "string") return undefined;
        if (key === "then") {
          return undefined;
        }
        // Recursively compose the full path until a function is invoked
        return createRecursiveProxy(callback, [...path, key], root ?? proxy);
      },
      apply(_1, _2, args): unknown {
        if (path.length === 0) {
          return proxy;
        }
        // Call the callback function with the entire path we
        // recursively created and forward the arguments
        return callback({
          path,
          args,
          proxy: root
        });
      }
    }
  );

  return proxy;
}

export const createAPIClient = (
  schema: ZodSchema,
  shape: ZodRawShape
): ZupassAPI =>
  createRecursiveProxy(
    async (opts) => {
      const path = [...opts.path]; // e.g. ["fs", "list"]
      console.log(path);
      const operation = path.pop();
      if (!operation) {
        throw new Error("Path is empty");
      }
      let containingObject = shape;
      for (const key of path) {
        const obj = containingObject[key];
        if (obj instanceof ZodObject) {
          containingObject = obj.shape;
        } else {
          throw new Error(`Unexpected non-object at path ${path.join(".")}`);
        }
      }
      const operationSchema = containingObject[operation];
      if (!operationSchema) {
        throw new Error(
          `Operation ${operation} not found at path ${path.join(".")}`
        );
      }
      if (!(operationSchema instanceof ZodFunction)) {
        throw new Error(
          `Operation ${operation} is not a function at path ${path.join(".")}`
        );
      }

      const dotPath = `${path.join(".")}.${operation}`;

      const result = await invoke(opts.proxy as ZupassAPI, dotPath, opts.args);
      console.log(result);
      return result;
    },
    [],
    undefined
  ) as ZupassAPI;
//   ^? provide empty array as path to begin with
