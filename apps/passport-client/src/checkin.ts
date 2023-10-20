import {
  checkinTicketById,
  checkTicketById,
  CheckTicketByIdResult,
  CheckTicketInByIdResult,
  OfflineDevconnectTicket,
  OfflineSecondPartyTicket,
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
  stateContext: StateContextValue
): OfflineDevconnectTicket | undefined {
  return stateContext
    .getState()
    .offlineTickets?.devconnectTickets?.find((t) => t.id === ticketId);
}

function getCheckedInOfflineDevconnectTicket(
  ticketId: string,
  stateContext: StateContextValue
): OfflineDevconnectTicket | undefined {
  const state = stateContext.getState();
  return state.checkedinOfflineDevconnectTickets?.find(
    (t) => t.id === ticketId
  );
}

function isOfflineDevconnectTicketCheckedIn(
  ticketId: string,
  stateContext: StateContextValue
): boolean {
  return (
    getCheckedInOfflineDevconnectTicket(ticketId, stateContext) !== undefined
  );
}

function getOfflineSecondPartyTicket(
  ticketId: string,
  stateContext: StateContextValue
): OfflineSecondPartyTicket | undefined {
  const state = stateContext.getState();
  const ticket = state.offlineTickets.secondPartyTickets.find(
    (t) => t.id === ticketId
  );

  return ticket;
}

function checkinOfflineDevconnectTicket(
  ticketId: string,
  stateContext: StateContextValue
): OfflineDevconnectTicket | undefined {
  const state = stateContext.getState();
  const offlineTickets = stateContext.getState().offlineTickets;
  const checkedinOfflineDevconnectTickets =
    state.checkedinOfflineDevconnectTickets;

  if (!offlineTickets || !checkedinOfflineDevconnectTickets) {
    return undefined;
  }

  const ticket = getOfflineDevconnectTicket(ticketId, stateContext);

  if (!ticket) {
    return undefined;
  }

  _.remove(offlineTickets.devconnectTickets, (t) => t.id === ticketId);

  const ticketCopy = { ...ticket };
  ticketCopy.checkinTimestamp = new Date().toISOString();
  checkedinOfflineDevconnectTickets.push(ticketCopy);

  saveOfflineTickets(offlineTickets);
  saveCheckedInOfflineTickets(checkedinOfflineDevconnectTickets);
  stateContext.update({
    offlineTickets,
    checkedinOfflineDevconnectTickets
  });
  return ticketCopy;
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

export async function devconnectCheckInByIdWithOffline(
  ticketId: string,
  stateContext: StateContextValue
): Promise<CheckTicketInByIdResult> {
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

export async function secondPartyCheckByIdWithOffline(
  ticketId: string,
  timestamp: string,
  stateContext: StateContextValue
): Promise<VerifyTicketByIdResult> {
  if (IS_OFFLINE) {
    const ticket = getOfflineSecondPartyTicket(ticketId, stateContext);

    if (!ticket) {
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
        group: ticket.group,
        publicKeyName: ticket.publicKeyName,
        verified: true,
        productId: ticket.productId
      }
    };
  } else {
    return await requestVerifyTicketById(appConfig.zupassServer, {
      ticketId,
      timestamp
    });
  }
}

export async function secondPartyCheckByPCDWithOffline(
  pcd: string, // JSON.stringify(SerializedPCD<ZKEdDSAEventTicketPCD>)
  stateContext: StateContextValue
): Promise<VerifyTicketResult> {
  if (IS_OFFLINE) {
    const parsed = await ZKEdDSAEventTicketPCDPackage.deserialize(
      JSON.parse(pcd).pcd
    );
    const ticketId = parsed.claim.partialTicket.ticketId;
    const ticket = getOfflineSecondPartyTicket(ticketId, stateContext);

    if (!ticket) {
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
        group: ticket.group,
        // todo
        publicKeyName: ticket.publicKeyName,
        verified: true
      }
    };
  } else {
    return await requestVerifyTicket(appConfig.zupassServer, {
      pcd
    });
  }
}
