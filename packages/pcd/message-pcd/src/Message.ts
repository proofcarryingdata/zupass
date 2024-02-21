import { z } from "zod";

const MessageMetadataSchema = z.object({
  authorSemaphoreV3Signature: z.string().optional(), // SerializedPCD<SemaphoreSignaturePCD>
  authorSemaphoreV4Signature: z.string().optional() // SerializedPCD<SemaphoreV4SignaturePCD>
});

export type MessageMetadata = z.infer<typeof MessageMetadataSchema>;

export const MessageSchema = z.object({
  metadata: MessageMetadataSchema.optional(),

  /**
   * ID. Generally set to equal the id of its wrapping
   * {@link Message}.
   */
  id: z.string().optional(),

  /**
   * Used by Zupass client as the display name shown in the
   * title of PCDs.
   */
  displayName: z.string().optional(),

  /**
   * Markdown formatted body.
   */
  mdBody: z.string().optional(),

  htmlBody: z.string().optional(),
  iframeUrl: z.string().optional(),
  pipelineID: z.string().optional(),

  // potentially useful values for the future below.

  authorSemaphoreV3Id: z.string().optional(),
  authorSemaphoreV4Id: z.string().optional(),
  nonce: z.number().optional(),
  type: z.string().optional(),
  scode: z.number().optional()
});

/**
 * Similar to {@link LemonadePipelineDefinition} but for Pretix-based Pipelines.
 */
export type Message = z.infer<typeof MessageSchema>;
