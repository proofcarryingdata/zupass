import { PollFeedResponseValue } from "@pcd/passport-interface";
import { SerializedPCD } from "@pcd/pcd-types";
import { Router } from "express";
import { Pipeline } from "../pipelines/types";
import { BasePipelineCapability } from "../types";
import { PipelineCapability } from "./types";

/**
 * TODO:
 * - actually interpret HTTP requests, and respond appropriately.
 * - probably move to a different file than this
 */
export async function setupFeedCapabilityRoutes(
  router: Router,
  pipeline: Pipeline,
  capability: FeedIssuanceCapability
): Promise<void> {
  const urlPath = `/generic-issuance/${pipeline.id}/${capability.subId}/poll-feed`;
  capability.urlPath = urlPath;
  router.post(urlPath, (req, res) => {
    res.send("ok"); // TODO
  });
}

/**
 * Can be attached to a {@link Pipeline} that can issue feeds to external
 * users. The server can make use of the information encoded in this Capability
 * to connect it to the other services - express routing, etc.
 */
export interface FeedIssuanceCapability extends BasePipelineCapability {
  type: PipelineCapability.FeedIssuanceCapability;
  /**
   * Used to differentiate between different feeds on the same {@link Pipeline}.
   * TODO:
   * - ensure at runtime that a {@link Pipeline} doesn't contain capabilities
   *   with overlapping {@link subId}s.
   */
  subId: string;
  issue(credential: SerializedPCD): Promise<PollFeedResponseValue>;
}

export function isFeedIssuanceCapability(
  capability: BasePipelineCapability
): capability is FeedIssuanceCapability {
  return capability.type === PipelineCapability.FeedIssuanceCapability;
}
