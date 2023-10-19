import {
  checkinTicketById,
  checkTicketById,
  CheckTicketByIdResult,
  CheckTicketInByIdResult,
  KnownTicketGroup,
  OfflineDevconnectTicket,
  OfflineZuconnectTicket,
  requestVerifyTicket,
  requestVerifyTicketById,
  VerifyTicketByIdResult,
  VerifyTicketResult
} from "@pcd/passport-interface";
import { ZKEdDSAEventTicketPCDPackage } from "@pcd/zk-eddsa-event-ticket-pcd";
import _ from "lodash";
import { appConfig } from "./appConfig";
import { StateContextValue } from "./dispatch";
import {
  saveCheckedInOfflineTickets,
  saveOfflineTickets
} from "./localstorage";

const IS_OFFLINE = true;

function getOfflineDevconnectTicket(
  ticketId: string,
  state: StateContextValue
): OfflineDevconnectTicket | undefined {
  return state
    .getState()
    .offlineTickets?.devconnectTickets?.find((t) => t.id === ticketId);
}

function getCheckedInOfflineDevconnectTicket(
  ticketId: string,
  state: StateContextValue
): OfflineDevconnectTicket | undefined {
  return state
    .getState()
    .checkedinOfflineTickets?.devconnectTickets?.find((t) => t.id === ticketId);
}

function isOfflineDevconnectTicketCheckedIn(
  ticketId: string,
  state: StateContextValue
): boolean {
  return getCheckedInOfflineDevconnectTicket(ticketId, state) !== undefined;
}

function getOfflineZuconnectTicket(
  ticketId: string,
  state: StateContextValue
): OfflineZuconnectTicket | undefined {
  return state
    .getState()
    .offlineTickets?.zuconnectTickets?.find((t) => t.id === ticketId);
}

function checkinOfflineDevconnectTicket(
  ticketId: string,
  state: StateContextValue
): OfflineDevconnectTicket | undefined {
  const offlineTickets = state.getState().offlineTickets;
  const checkedinOfflineTickets = state.getState().checkedinOfflineTickets;

  if (!offlineTickets || !checkedinOfflineTickets) {
    return undefined;
  }

  const ticket = getOfflineDevconnectTicket(ticketId, state);

  if (!ticket) {
    return undefined;
  }

  const ticketCopy = { ...ticket };
  ticketCopy.checkinTimestamp = new Date().toISOString();
  _.remove(offlineTickets.devconnectTickets, (t) => t.id === ticketId);
  checkedinOfflineTickets.devconnectTickets.push(ticketCopy);
  saveOfflineTickets(offlineTickets);
  saveCheckedInOfflineTickets(checkedinOfflineTickets);
  return ticketCopy;
}

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
    if (isOfflineDevconnectTicketCheckedIn(ticketId, stateContext)) {
      const checkedInTicket = getCheckedInOfflineDevconnectTicket(
        ticketId,
        stateContext
      );
      return {
        success: false,
        error: {
          name: "AlreadyCheckedIn",
          detailedMessage: "You've checked this ticket in in offline mode.",
          checker: "You",
          checkinTimestamp: checkedInTicket?.checkinTimestamp
        }
      };
    }

    const checkedInTicket = checkinOfflineDevconnectTicket(
      ticketId,
      stateContext
    );

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
    const offlineZuconnectTicket = getOfflineZuconnectTicket(
      ticketId,
      stateContext
    );

    if (!offlineZuconnectTicket) {
      return {
        success: true,
        value: {
          verified: false,
          message: "Unknown ticket. Go online to get the latest tickets."
        }
      };
    }

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
  pcd: string, // JSON.stringify(SerializedPCD<ZKEdDSAEventTicketPCD>)
  stateContext: StateContextValue
): Promise<VerifyTicketResult> {
  if (IS_OFFLINE) {
    const parsed = await ZKEdDSAEventTicketPCDPackage.deserialize(
      JSON.parse(pcd).pcd
    );
    const ticketId = parsed.claim.partialTicket.ticketId;
    const offlineZuconnectTicket = getOfflineZuconnectTicket(
      ticketId,
      stateContext
    );

    if (!offlineZuconnectTicket) {
      return {
        success: true,
        value: {
          verified: false,
          message: "Unknown ticket. Go online to get the latest tickets."
        }
      };
    }

    return {
      success: true,
      value: {
        group: KnownTicketGroup.Zuconnect23,
        // todo
        publicKeyName: "todo",
        verified: true
      }
    };
  } else {
    return await requestVerifyTicket(appConfig.zupassServer, {
      pcd
    });
  }
}
