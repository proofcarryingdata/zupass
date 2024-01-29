import {
  CheckTicketInRequest,
  CheckTicketInResponseValue
} from "@pcd/passport-interface";
import { BasePipelineCapability } from "../types";
import { PipelineCapability } from "./types";

/**
 * Similar to {@link FeedIssuanceCapability} except used to declare the capability
 * of a feed to respond to check in requests.
 */
export interface CheckinCapability extends BasePipelineCapability {
  type: PipelineCapability.Checkin;
  checkin(request: CheckTicketInRequest): Promise<CheckTicketInResponseValue>;
  getCheckinUrl(): string;
}

export function isCheckinCapability(
  capability: BasePipelineCapability
): capability is CheckinCapability {
  return capability.type === PipelineCapability.Checkin;
}

export function generateCheckinUrlPath(pipelineId: string): string {
  return `/generic-issuance/api/check-in/${pipelineId}`;
}
