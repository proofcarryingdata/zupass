import {
  checkinTicketById,
  checkTicketById,
  CheckTicketByIdResult,
  CheckTicketInByIdResult,
  KnownTicketGroup,
  requestVerifyTicketById,
  VerifyTicketResult
} from "@pcd/passport-interface";
import { Identity } from "@semaphore-protocol/identity";
import { appConfig } from "./appConfig";

const IS_OFFLINE = true;

export async function devconnectCheckInByIdWithOffline(
  ticketId: string,
  userIdentity: Identity
): Promise<CheckTicketInByIdResult> {
  if (IS_OFFLINE) {
    return {
      success: true,
      value: undefined
    };
  } else {
    return await checkinTicketById(
      appConfig.zupassServer,
      ticketId,
      userIdentity
    );
  }
}

export async function devconnectCheckByIdWithOffline(
  ticketId: string,
  userIdentity: Identity
): Promise<CheckTicketByIdResult> {
  if (IS_OFFLINE) {
    return {
      success: true,
      value: {
        // todo
        attendeeEmail: "offline",
        attendeeName: "offline",
        eventName: "offline",
        ticketName: "offline"
      }
    };
  } else {
    return await checkTicketById(
      appConfig.zupassServer,
      ticketId,
      userIdentity
    );
  }
}

export async function zuconnectCheckByIdWithOffline(
  ticketId: string,
  timestamp: string
): Promise<VerifyTicketResult> {
  if (IS_OFFLINE) {
    return {
      success: true,
      value: {
        group: KnownTicketGroup.Zuconnect23,
        publicKeyName: "",
        verified: true
      }
    };
  } else {
    return await requestVerifyTicketById(appConfig.zupassServer, {
      ticketId,
      timestamp
    });
  }
}
