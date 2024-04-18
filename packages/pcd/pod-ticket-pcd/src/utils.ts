import { PODEntries } from "@pcd/pod";
import { ZodRawShape, ZodSchema } from "zod";

export function cryptographic<T>(a: T): T {
  return a;
}

export function canBeBigInt(a: string | number | bigint | boolean): boolean {
  try {
    BigInt(a);
  } catch (_err) {
    return false;
  }
  return true;
}

const supportedFieldTypes = [
  "ZodString",
  "ZodNativeEnum",
  "ZodNumber",
  "ZodBoolean",
  "ZodOptional",
  "ZodEffects"
] as const;

export function dataToPodEntries<T>(
  rawData: T,
  schema: ZodSchema,
  shape: ZodRawShape
): PODEntries {
  const result = schema.safeParse(rawData);
  const entries: PODEntries = {};
  if (result.success) {
    const data = result.data;
    for (const [key, field] of Object.entries(shape)) {
      let typeName = field._def["typeName"];
      if (typeName === "ZodOptional") {
        if (!data[key]) {
          continue;
        } else {
          typeName = field._def.innerType._def.typeName;
        }
      }
      if (!supportedFieldTypes.includes(typeName)) {
        continue;
      }
      switch (typeName) {
        case "ZodString":
          entries[key] = {
            value: data[key],
            type: "string"
          };
          break;
        case "ZodNativeEnum":
        case "ZodNumber":
          entries[key] = {
            value: BigInt(data[key]),
            type: "int"
          };
          break;
        case "ZodBoolean":
          entries[key] = {
            value: data[key] ? 1n : 0n,
            type: "int"
          };
          break;
        case "ZodEffects":
          if (field._def.effect.transform === cryptographic) {
            entries[key] = {
              value: BigInt(data[key]),
              type: "cryptographic"
            };
          }
          break;
      }
    }
  } else {
    throw new Error("parse failed");
  }
  return entries;
}
