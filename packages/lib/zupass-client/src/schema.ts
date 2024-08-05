import { z } from "zod";
import { ZupassAPI } from "./api";

export const ZupassAPISchema = z.object({
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
    get: z
      .function()
      .args(z.string())
      .returns(
        z.promise(
          z.object({
            type: z.string(),
            pcd: z.string()
          })
        )
      ),
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
  })
}) satisfies z.ZodSchema<ZupassAPI>;
