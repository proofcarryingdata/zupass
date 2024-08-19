import type { GPCPCDArgs, PODPCDRecordArg } from "@pcd/gpc-pcd";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { z } from "zod";
import { ZupassAPI } from "./api";

export const SerializedPCDSchema = z.object({
  type: z.string(),
  pcd: z.string()
});

const StringArgumentSchema = z.object({
  argumentType: z.literal(ArgumentTypeName.String),
  value: z.string().optional()
});

const PCDArgumentSchema = z.object({
  argumentType: z.literal(ArgumentTypeName.PCD),
  value: SerializedPCDSchema.optional()
});

const PODPCDRecordArgumentSchema = z.object({
  argumentType: z.literal(ArgumentTypeName.RecordContainer),
  value: z.record(z.string(), PCDArgumentSchema).optional()
}) satisfies z.ZodSchema<PODPCDRecordArg>;

const PODQuerySchema = z.object({
  entries: z.any()
});

export const GPCPCDArgsSchema = z.object({
  proofConfig: StringArgumentSchema,
  pods: PODPCDRecordArgumentSchema,
  identity: PCDArgumentSchema,
  externalNullifier: StringArgumentSchema,
  membershipLists: StringArgumentSchema,
  watermark: StringArgumentSchema
}) satisfies z.ZodSchema<GPCPCDArgs>;

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
    get: z.function().args(z.string()).returns(z.promise(SerializedPCDSchema)),
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
    prove: z
      .function()
      .args(GPCPCDArgsSchema)
      .returns(z.promise(SerializedPCDSchema))
  }),
  feeds: z.object({
    requestAddSubscription: z
      .function()
      .args(z.string(), z.string())
      .returns(z.promise(z.void()))
  }),
  identity: z.object({
    getIdentityCommitment: z.function().returns(z.promise(z.bigint())),
    getAttestedEmails: z
      .function()
      .returns(z.promise(z.array(SerializedPCDSchema)))
  }),
  pod: z.object({
    query: z
      .function()
      .args(PODQuerySchema)
      .returns(z.promise(z.array(z.string())))
  })
}) satisfies z.ZodSchema<ZupassAPI>;
