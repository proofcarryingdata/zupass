import { EdDSATicketPCD, EdDSATicketPCDPackage } from "@pcd/eddsa-ticket-pcd";
import {
  Feed,
  PollFeedRequest,
  PollFeedResponseValue
} from "@pcd/passport-interface";
import {
  DeleteFolderPermission,
  PCDActionType,
  PCDPermissionType,
  ReplaceInFolderPermission
} from "@pcd/pcd-collection";
import { Pipeline } from "../pipelines/types";
import { BasePipelineCapability } from "../types";
import { PipelineCapability } from "./types";

/**
 * Can be attached to a {@link Pipeline} that can issue feeds to external
 * users. The server can make use of the information encoded in this Capability
 * to connect it to the other services - express routing, etc.
 */
export class FeedIssuanceCapability implements BasePipelineCapability {
  private pipeline: Pipeline;
  public readonly type: PipelineCapability.FeedIssuance;
  /**
   * Used to differentiate between different feeds on the same {@link Pipeline}.
   * TODO:
   * - ensure at runtime that a {@link Pipeline} doesn't contain capabilities
   *   with overlapping {@link feedId}s.
   */
  public readonly feedId: string;
  private folder: string;
  private name: string;
  private description: string;

  public constructor(
    pipeline: Pipeline,
    feedId: string,
    folder: string,
    name: string,
    description: string
  ) {
    this.type = PipelineCapability.FeedIssuance;
    this.pipeline = pipeline;
    this.feedId = feedId;
    this.folder = folder;
    this.name = name;
    this.description = description;
  }

  public getFeedUrl(): string {
    return generateIssuanceUrlPath(this.pipeline.id);
  }

  public getFeed(): Feed {
    const folder = this.folder;
    return {
      id: this.feedId,
      name: `Feed ${this.feedId}`,
      description: "Generic issuance feed",
      permissions: [
        {
          folder,
          type: PCDPermissionType.ReplaceInFolder
        } as ReplaceInFolderPermission,
        {
          folder,
          type: PCDPermissionType.DeleteFolder
        } as DeleteFolderPermission
      ],
      credentialRequest: {
        signatureType: "sempahore-signature-pcd",
        pcdType: "email-pcd"
      }
    };
  }

  public async issue(req: PollFeedRequest): Promise<PollFeedResponseValue> {
    if (!req.pcd) {
      throw new Error(`Missing credential for ${this.feedId}`);
    }

    const tickets = (await this.pipeline.issue(req.pcd)) as EdDSATicketPCD[];
    return {
      actions: [
        {
          type: PCDActionType.ReplaceInFolder,
          folder: this.folder,
          pcds: await Promise.all(
            tickets.map((t) => EdDSATicketPCDPackage.serialize(t))
          )
        }
      ]
    };
  }
}

export function isFeedIssuanceCapability(
  capability: BasePipelineCapability
): capability is FeedIssuanceCapability {
  return capability.type === PipelineCapability.FeedIssuance;
}

export function generateIssuanceUrlPath(pipelineId: string): string {
  return `/generic-issuance/api/poll-feed/${pipelineId}`;
}
