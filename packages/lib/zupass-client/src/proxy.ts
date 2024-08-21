import { ZodFunction, ZodObject, ZodRawShape, ZodSchema } from "zod";
import { ZupassAPI } from "./api";
import { invoke } from "./client";

interface ProxyCallbackOptions {
  path: readonly string[];
  args: readonly unknown[];
  proxy: unknown;
}

type ProxyCallback = (opts: ProxyCallbackOptions) => unknown;

/**
 * Create a recursive proxy that forwards method calls to a callback.
 *
 * @param callback The callback to invoke when a method is called
 * @param path The path of the method being called
 * @param root The root object being proxied
 * @returns A proxy object that forwards method calls to the callback
 */
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

/**
 * Create a client for a Zupass API.
 *
 * Uses the Zod schema to create a recursive proxy that forwards method
 * calls to the Zupass instance. The client object is asserted to be of type
 * ZupassAPI, which enables TypeScript to provide compile-time type safety for
 * API calls.
 *
 * @param schema The Zod schema for the API
 * @param shape The shape of the API
 * @returns A client for the API
 */
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
      // Get the Zod schema for the operation. These are defined as ZodFunction
      // objects, which define both parameters and return type.
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

      // Invoke the operation on the Zupass instance.
      // This will send a message over the message port to Zupass.
      return invoke(opts.proxy as ZupassAPI, dotPath, opts.args);
    },
    [],
    undefined
  ) as ZupassAPI;
