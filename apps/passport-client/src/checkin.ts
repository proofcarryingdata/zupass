import {
  checkinTicketById,
  checkTicketById,
  CheckTicketByIdResult,
  CheckTicketInByIdResult,
  KnownTicketGroup,
  requestVerifyTicket,
  requestVerifyTicketById,
  VerifyTicketByIdResult,
  VerifyTicketResult
} from "@pcd/passport-interface";
import { appConfig } from "./appConfig";
import { StateContextValue } from "./dispatch";

const IS_OFFLINE = true;

export async function devconnectCheckInByIdWithOffline(
  ticketId: string,
  stateContext: StateContextValue
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
      stateContext.getState().identity
    );
  }
}

export async function devconnectCheckByIdWithOffline(
  ticketId: string,
  stateContext: StateContextValue
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
      stateContext.getState().identity
    );
  }
}

export async function zuconnectCheckByIdWithOffline(
  ticketId: string,
  timestamp: string,
  stateContext: StateContextValue
): Promise<VerifyTicketByIdResult> {
  if (IS_OFFLINE) {
    return {
      success: true,
      value: {
        group: KnownTicketGroup.Zuconnect23,
        publicKeyName: "",
        verified: true,
        productId: ""
      }
    };
  } else {
    return await requestVerifyTicketById(appConfig.zupassServer, {
      ticketId,
      timestamp
    });
  }
}

export async function zuconnectCheckByPCDWithOffline(
  pcd: string, // JSON.stringify(SerializedPCD<ZKEventTicketPCD>)
  stateContext: StateContextValue
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
    return await requestVerifyTicket(appConfig.zupassServer, {
      pcd
    });
  }
}
