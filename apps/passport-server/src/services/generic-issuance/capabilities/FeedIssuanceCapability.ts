import {
  PollFeedRequest,
  PollFeedResponseValue
} from "@pcd/passport-interface";
import { BasePipelineCapability } from "../types";
import { PipelineCapability } from "./types";

/**
 * Can be attached to a {@link Pipeline} that can issue feeds to external
 * users. The server can make use of the information encoded in this Capability
 * to connect it to the other services - express routing, etc.
 */
export interface FeedIssuanceCapability extends BasePipelineCapability {
  type: PipelineCapability.FeedIssuance;
  /**
   * Used to differentiate between different feeds on the same {@link Pipeline}.
   * TODO:
   * - ensure at runtime that a {@link Pipeline} doesn't contain capabilities
   *   with overlapping {@link feedId}s.
   */
  feedId: string;
  issue(request: PollFeedRequest): Promise<PollFeedResponseValue>;
  getFeedUrl(): string;
  /**
   * TODO: implement endpoint that lets Zupass figure out what permissions / etc. a
   * feed requires.
   */
}

export function isFeedIssuanceCapability(
  capability: BasePipelineCapability
): capability is FeedIssuanceCapability {
  return capability.type === PipelineCapability.FeedIssuance;
}

export function generateIssuanceUrlPath(pipelineId: string): string {
  return `/generic-issuance/api/poll-feed/${pipelineId}`;
}
