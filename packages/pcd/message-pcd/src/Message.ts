import { checkExists } from "@pcd/pcd-types";
import { z } from "zod";
import { MessagePCD } from "./MessagePCD";
import { derializeUtf8String } from "./utils/serialization";

const MessageMetadataSchema = z.object({
  authorSemaphoreV3Signature: z.string().optional(), // SerializedPCD<SemaphoreSignaturePCD>
  authorSemaphoreV4Signature: z.string().optional() // SerializedPCD<SemaphoreV4SignaturePCD>
});

export type MessageMetadata = z.infer<typeof MessageMetadataSchema>;

const MessageSchema = z.object({
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

  // potentially useful values for the future below.

  authorSemaphoreV3Id: z.string().optional(),
  authorSemaphoreV4Id: z.string().optional(),
  nonce: z.number().optional(),
  buf: z.instanceof(Buffer).optional(),
  type: z.string().optional()
});

/**
 * Similar to {@link LemonadePipelineDefinition} but for Pretix-based Pipelines.
 */
export type Message = z.infer<typeof MessageSchema>;

/**
 *
 */
export function getMessage<T extends Message>(
  eddsaSig: MessagePCD<T>
): (Message & T) | undefined {
  try {
    checkExists(eddsaSig.proof.signature.claim.message[0]);
    // by convention, MessagePCD serializes into an EdDSAPCD by converting
    // its `message` field
    const stringifiedData = eddsaSig.proof.signature.claim.message[0];
    const strBody = derializeUtf8String(
      stringifiedData,
      eddsaSig.proof.stringLength
    );
    const imageData = JSON.parse(strBody) as Message & T;
    return imageData;
  } catch (e) {
    console.warn(e);
    return undefined;
  }
}
