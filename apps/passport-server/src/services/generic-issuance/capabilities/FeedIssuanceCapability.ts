import {
  PollFeedRequest,
  PollFeedResponseValue
} from "@pcd/passport-interface";
import urljoin from "url-join";
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
  getListFeedUrl(): string;
  feedDisplayName: string;
  feedDescription: string;
  feedFolder: string;
}

export function isFeedIssuanceCapability(
  capability: BasePipelineCapability
): capability is FeedIssuanceCapability {
  return capability.type === PipelineCapability.FeedIssuance;
}

export function generateIssuanceUrl(
  pipelineId: string,
  feedId: string
): string {
  return urljoin(
    process.env.PASSPORT_SERVER_URL as string,
    `/generic-issuance/api/feed/${pipelineId}/${feedId}`
  );
}

export function generateIssuanceListFeedUrl(
  pipelineId: string,
  feedId: string
): string {
  return urljoin(
    process.env.PASSPORT_SERVER_URL as string,
    `/generic-issuance/api/feed/${pipelineId}/${feedId}`
  );
}
