import {
  CheckTicketInRequest,
  CheckTicketInResponseValue
} from "@pcd/passport-interface";
import { Router } from "express";
import { Pipeline } from "../pipelines/types";
import { BasePipelineCapability } from "../types";
import { PipelineCapability } from "./types";

/**
 * Similar to {@link FeedIssuanceCapability} except used to declare the capability
 * of a feed to respond to check in requests.
 */
export interface CheckinCapability extends BasePipelineCapability {
  type: PipelineCapability.Checkin;
  checkin(request: CheckTicketInRequest): Promise<CheckTicketInResponseValue>;
}

export function isCheckinCapability(
  capability: BasePipelineCapability
): capability is CheckinCapability {
  return capability.type === PipelineCapability.Checkin;
}

/**
 * TODO:
 * - actually interpret HTTP requests, and respond appropriately.
 * - probably move to a different file than this
 */
export async function setupCheckinCapabilityRoutes(
  router: Router,
  pipeline: Pipeline,
  capability: CheckinCapability
): Promise<void> {
  const urlPath = `/generic-issuance/${pipeline.id}/checkin`;
  capability.urlPath = urlPath;
  router.post(urlPath, (req, res) => {
    res.send("ok"); // TODO
  });
}
