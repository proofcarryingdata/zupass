import {
  CredentialManager,
  PODBOX_CREDENTIAL_REQUEST,
  PodboxOfflineTicket,
  PodboxTicketActionPreCheckResult,
  PodboxTicketActionResult,
  requestPodboxTicketAction,
  requestPodboxTicketActionPreCheck
} from "@pcd/passport-interface";
import _ from "lodash";
import urljoin from "url-join";
import { appConfig } from "./appConfig";
import { StateContextValue } from "./dispatch";
import {
  saveCheckedInPodboxOfflineTickets,
  savePodboxOfflineTickets
} from "./localstorage";

/**
 * For debugging purposes, makes the checkin flow go through the offline-mode
 * version even in the case that we're actually online.
 */
const DEBUG_FORCE_OFFLINE = false;

function getOfflinePodboxTicket(
  ticketId: string,
  stateContext: StateContextValue
): PodboxOfflineTicket | undefined {
  return stateContext
    .getState()
    .podboxOfflineTickets.find((t) => t.id === ticketId);
}

function getCheckedInOfflinePodboxTicket(
  ticketId: string,
  stateContext: StateContextValue
): PodboxOfflineTicket | undefined {
  const state = stateContext.getState();
  return state.checkedInOfflinePodboxTickets.find((t) => t.id === ticketId);
}

function isOfflinePodboxTicketCheckedIn(
  ticketId: string,
  stateContext: StateContextValue
): boolean {
  return getCheckedInOfflinePodboxTicket(ticketId, stateContext) !== undefined;
}

function checkinOfflinePodboxTicket(
  ticketId: string,
  stateContext: StateContextValue
): PodboxOfflineTicket | undefined {
  const state = stateContext.getState();
  const { podboxOfflineTickets } = stateContext.getState();
  const { checkedInOfflinePodboxTickets } = state;

  if (!podboxOfflineTickets || !checkedInOfflinePodboxTickets) {
    return undefined;
  }

  const ticket = getOfflinePodboxTicket(ticketId, stateContext);

  if (!ticket) {
    return undefined;
  }

  _.remove(podboxOfflineTickets, (t) => t.id === ticketId);

  const ticketCopy = { ...ticket };
  ticketCopy.checkinTimestamp = new Date().toISOString();
  checkedInOfflinePodboxTickets.push(ticketCopy);

  savePodboxOfflineTickets(podboxOfflineTickets);
  saveCheckedInPodboxOfflineTickets(checkedInOfflinePodboxTickets);
  stateContext.update({
    podboxOfflineTickets,
    checkedInOfflinePodboxTickets
  });
  return ticketCopy;
}

export async function podboxPreCheckWithOffline(
  ticketId: string,
  eventId: string,
  stateContext: StateContextValue
): Promise<PodboxTicketActionPreCheckResult> {
  if (DEBUG_FORCE_OFFLINE || stateContext.getState().offline) {
    if (isOfflinePodboxTicketCheckedIn(ticketId, stateContext)) {
      const checkedInTicket = getCheckedInOfflinePodboxTicket(
        ticketId,
        stateContext
      ) as PodboxOfflineTicket; // We know this exists due to the above check
      return {
        success: true,
        value: {
          success: true,
          checkinActionInfo: {
            permissioned: true,
            canCheckIn: false,
            reason: {
              name: "AlreadyCheckedIn",
              detailedMessage: "This attendee has already been checked in",
              checkinTimestamp: checkedInTicket.checkinTimestamp as string,
              checker: checkedInTicket.checker ?? "Unknown"
            },
            ticket: {
              attendeeEmail: checkedInTicket.attendeeEmail,
              attendeeName: checkedInTicket.attendeeName,
              eventName: checkedInTicket.eventName,
              ticketName: checkedInTicket.ticketName
            }
          }
        }
      };
    }
    const ticket = getOfflinePodboxTicket(ticketId, stateContext);

    if (ticket) {
      if (ticket.is_consumed) {
        return {
          success: true,
          value: {
            success: true,
            checkinActionInfo: {
              permissioned: true,
              canCheckIn: false,
              reason: {
                name: "AlreadyCheckedIn",
                detailedMessage: "This attendee has already been checked in",
                checkinTimestamp: ticket.checkinTimestamp as string,
                checker: ticket.checker ?? "Unknown"
              },
              ticket: {
                attendeeEmail: ticket.attendeeEmail,
                attendeeName: ticket.attendeeName,
                eventName: ticket.eventName,
                ticketName: ticket.ticketName
              }
            }
          }
        };
      }

      return {
        success: true,
        value: {
          success: true,
          checkinActionInfo: {
            permissioned: true,
            canCheckIn: true,
            ticket: {
              attendeeEmail: ticket.attendeeEmail,
              attendeeName: ticket.attendeeName,
              eventName: ticket.eventName,
              ticketName: ticket.ticketName
            }
          }
        }
      };
    }

    return {
      success: true,
      value: {
        success: false,
        error: {
          name: "NetworkError",
          detailedMessage:
            "You are in offline mode, " +
            "and this ticket is not present in the local ticket backup."
        }
      }
    };
  } else {
    const { pcds, identity, credentialCache } = stateContext.getState();
    const credentialManager = new CredentialManager(
      identity,
      pcds,
      credentialCache
    );
    return await requestPodboxTicketActionPreCheck(
      urljoin(appConfig.zupassServer, "generic-issuance/api/pre-check"),
      await credentialManager.requestCredential(PODBOX_CREDENTIAL_REQUEST),
      { checkin: true },
      ticketId,
      eventId
    );
  }
}

export async function podboxCheckInWithOffline(
  ticketId: string,
  eventId: string,
  stateContext: StateContextValue
): Promise<PodboxTicketActionResult> {
  if (DEBUG_FORCE_OFFLINE || stateContext.getState().offline) {
    if (isOfflinePodboxTicketCheckedIn(ticketId, stateContext)) {
      const checkedInTicket = getCheckedInOfflinePodboxTicket(
        ticketId,
        stateContext
      );
      return {
        success: true,
        value: {
          success: false,
          error: {
            name: "AlreadyCheckedIn",
            detailedMessage: "You've checked this ticket in in offline mode.",
            checker: "You",
            checkinTimestamp: checkedInTicket?.checkinTimestamp as string
          }
        }
      };
    }

    checkinOfflinePodboxTicket(ticketId, stateContext);

    return {
      success: true,
      value: { success: true }
    };
  } else {
    const { pcds, identity, credentialCache } = stateContext.getState();
    const credentialManager = new CredentialManager(
      identity,
      pcds,
      credentialCache
    );
    return await requestPodboxTicketAction(
      urljoin(appConfig.zupassServer, "generic-issuance/api/check-in"),
      await credentialManager.requestCredential(PODBOX_CREDENTIAL_REQUEST),
      { checkin: true },
      ticketId,
      eventId
    );
  }
}
