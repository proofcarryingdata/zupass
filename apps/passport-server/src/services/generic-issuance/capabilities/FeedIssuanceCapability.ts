import {
  FeedIssuanceOptions,
  PipelineZuAuthConfig,
  PollFeedRequest,
  PollFeedResponseValue
} from "@pcd/passport-interface";
import urljoin from "url-join";
import { PCDHTTPError } from "../../../routing/pcdHttpError";
import { Pipeline } from "../pipelines/types";
import { BasePipelineCapability } from "../types";
import { PipelineCapability } from "./types";

/**
 * Can be attached to a {@link Pipeline} that can issue feeds to external
 * users. The server can make use of the information encoded in this Capability
 * to connect it to the other services - express routing, etc.
 */
export interface FeedIssuanceCapability extends BasePipelineCapability {
  type: PipelineCapability.FeedIssuance;
  issue(request: PollFeedRequest): Promise<PollFeedResponseValue>;
  feedUrl: string;
  options: FeedIssuanceOptions;
  getZuAuthConfig(): Promise<PipelineZuAuthConfig[]>;
}

export function isFeedIssuanceCapability(
  capability: BasePipelineCapability
): capability is FeedIssuanceCapability {
  return capability.type === PipelineCapability.FeedIssuance;
}

export function getFeedIssuanceCapability(
  pipeline: Pipeline,
  feedId?: string
): FeedIssuanceCapability | undefined {
  return pipeline.capabilities.find(
    (c) =>
      isFeedIssuanceCapability(c) && (!feedId || c.options.feedId === feedId)
  ) as FeedIssuanceCapability | undefined;
}

export function ensureFeedIssuanceCapability(
  pipeline: Pipeline,
  feedId: string | undefined
): FeedIssuanceCapability {
  const cap = getFeedIssuanceCapability(pipeline, feedId);

  if (!cap) {
    throw new PCDHTTPError(
      403,
      `pipeline ${pipeline.id} can't issue PCDs for feed id ${feedId}`
    );
  }

  return cap;
}

export function makeGenericIssuanceFeedUrl(
  pipelineId: string,
  feedId: string
): string {
  return urljoin(
    process.env.PASSPORT_SERVER_URL as string,
    `/generic-issuance/api/feed/${pipelineId}/${feedId}`
  );
}
