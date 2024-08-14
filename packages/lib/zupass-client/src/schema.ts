import { z } from "zod";
import { ZupassAPI } from "./api";

const serializedPCDSchema = z.object({
  type: z.string(),
  pcd: z.string()
});

export const ZupassAPISchema = z.object({
  _version: z.literal("1"),
  fs: z.object({
    list: z
      .function()
      .args(z.string())
      .returns(
        z.promise(
          z.array(
            z.union([
              z.object({ type: z.literal("folder"), name: z.string() }),
              z.object({
                type: z.literal("pcd"),
                id: z.string(),
                pcdType: z.string()
              })
            ])
          )
        )
      ),
    get: z.function().args(z.string()).returns(z.promise(serializedPCDSchema)),
    put: z
      .function()
      .args(
        z.string(),
        z.object({
          type: z.string(),
          pcd: z.string()
        })
      )
      .returns(z.promise(z.void())),
    delete: z.function().args(z.string()).returns(z.promise(z.void()))
  }),
  gpc: z.object({
    prove: z.function().args(z.any()).returns(z.promise(serializedPCDSchema))
  })
}) satisfies z.ZodSchema<ZupassAPI>;
