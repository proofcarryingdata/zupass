import {
  ActionConfigResponseValue,
  ZuboxCheckInRequest,
  ZuboxPreCheckRequest,
  ZuboxTicketActionResponseValue
} from "@pcd/passport-interface";
import urljoin from "url-join";
import { BasePipelineCapability } from "../types";
import { PipelineCapability } from "./types";

export enum CheckinStatus {
  Pending,
  Success
}

/**
 * Similar to {@link FeedIssuanceCapability} except used to declare the capability
 * of a feed to respond to check in requests.
 */
export interface CheckinCapability extends BasePipelineCapability {
  type: PipelineCapability.Checkin;
  checkin(
    request: ZuboxCheckInRequest
  ): Promise<ZuboxTicketActionResponseValue>;
  getCheckinUrl(): string;
  // Check-ins are based off ticket data, and tickets do not identify the
  // pipeline that issued them. As a workaround, the generic issuance service
  // will iterate over the pipelines, looking for one that can handle a checkin
  // request for the given event. This method should return true if the
  // pipeline is configured to handle checkin for the given eventId, or false
  // if not.
  canHandleCheckinForEvent(eventId: string): boolean;
  // Prior to check-in, a ticket is "pre-checked" to see if it is already
  // checked in, and whether the scanning user has permission to check it in.
  // This is called from passport-client after successfully scanning a QR code,
  // to determine whether to show the user the check-in screen, or a generic
  // response indicating that the ticket is recognized (or not, if the ticket
  // is invalid).
  preCheck(request: ZuboxPreCheckRequest): Promise<ActionConfigResponseValue>;
}

export function isCheckinCapability(
  capability: BasePipelineCapability
): capability is CheckinCapability {
  return capability.type === PipelineCapability.Checkin;
}

export function generateCheckinUrlPath(): string {
  return urljoin(
    process.env.PASSPORT_SERVER_URL as string,
    `/generic-issuance/api/check-in`
  );
}
