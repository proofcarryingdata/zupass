import type { GPCPCDArgs, PODPCDRecordArg } from "@pcd/gpc-pcd";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { z } from "zod";
import { ZupassRPC } from "./rpc_interfaces";

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

const PODValueSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("string"),
    value: z.string()
  }),
  z.object({
    type: z.literal("int"),
    value: z.bigint()
  }),
  z.object({
    type: z.literal("cryptographic"),
    value: z.bigint()
  }),
  z.object({
    type: z.literal("eddsa_pubkey"),
    value: z.string()
  })
]);

const PODQuerySchema = z.object({
  checks: z.array(
    z.discriminatedUnion("kind", [
      z.object({
        kind: z.literal("tupleMembership"),
        spec: z.object({
          name: z.string(),
          entries: z.array(z.string()),
          members: z.array(z.array(PODValueSchema)),
          exclude: z.boolean().optional()
        })
      }),
      z.object({
        kind: z.literal("signer"),
        signer: z.string(),
        exclude: z.boolean().optional()
      }),
      z.object({
        kind: z.literal("signerList"),
        signerList: z.array(z.string()),
        exclude: z.boolean().optional()
      }),
      z.object({
        kind: z.literal("signature"),
        signature: z.string(),
        exclude: z.boolean().optional()
      }),
      z.object({
        kind: z.literal("signatureList"),
        signatureList: z.array(z.string()),
        exclude: z.boolean().optional()
      })
    ])
  ),
  entries: z.object({
    entries: z.any(),
    checks: z.array(
      z.object({
        kind: z.literal("tupleMembership"),
        spec: z.object({
          name: z.string(),
          entries: z.array(z.string()),
          members: z.array(z.array(PODValueSchema)),
          exclude: z.boolean().optional()
        })
      })
    )
  })
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
  gpc: z.object({
    prove: z
      .function()
      .args(GPCPCDArgsSchema)
      .returns(z.promise(SerializedPCDSchema)),
    verify: z
      .function()
      .args(SerializedPCDSchema)
      .returns(z.promise(z.boolean()))
  }),
  identity: z.object({
    getSemaphoreV3Commitment: z.function().returns(z.promise(z.bigint()))
  }),
  pod: z.object({
    query: z
      .function()
      .args(PODQuerySchema)
      .returns(z.promise(z.array(z.string()))),
    insert: z.function().args(z.string()).returns(z.promise(z.void())),
    delete: z.function().args(z.string()).returns(z.promise(z.void())),
    subscribe: z.function().args(PODQuerySchema).returns(z.promise(z.string())),
    unsubscribe: z.function().args(z.string()).returns(z.promise(z.void()))
  })
}) satisfies z.ZodSchema<ZupassRPC>;
