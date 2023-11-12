import {
  CheckTicketByIdResult,
  CheckTicketInByIdResult,
  ISSUANCE_STRING,
  OfflineDevconnectTicket,
  requestCheckInById,
  requestCheckTicketById
} from "@pcd/passport-interface";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import _ from "lodash";
import { appConfig } from "./appConfig";
import { StateContextValue } from "./dispatch";
import {
  loadCheckinCredential,
  saveCheckedInOfflineTickets,
  saveCheckinCredential,
  saveOfflineTickets
} from "./localstorage";

/**
 * For debugging purposes, makes the checkin flow go through the offline-mode
 * version even in the case that we're actually online.
 */
const DEBUG_FORCE_OFFLINE = false;

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
  if (DEBUG_FORCE_OFFLINE || stateContext.getState().offline) {
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

    const ticket = getOfflineDevconnectTicket(ticketId, stateContext);

    if (ticket) {
      if (ticket.checkinTimestamp) {
        return {
          success: false,
          error: {
            name: "AlreadyCheckedIn",
            detailedMessage: "This attendee has already been checked in",
            checkinTimestamp: ticket.checkinTimestamp,
            checker: ticket.checker
          }
        };
      }

      return {
        success: true,
        value: {
          attendeeEmail: ticket.attendeeEmail,
          attendeeName: ticket.attendeeName,
          eventName: ticket.eventName,
          ticketName: ticket.ticketName
        }
      };
    }

    return {
      success: false,
      error: {
        name: "NetworkError",
        detailedMessage:
          "You are in offline mode, " +
          "and this ticket is not present in the local ticket backup."
      }
    };
  } else {
    let cachedSignaturePCD = await loadCheckinCredential();
    if (!cachedSignaturePCD) {
      cachedSignaturePCD = await SemaphoreSignaturePCDPackage.serialize(
        await SemaphoreSignaturePCDPackage.prove({
          identity: {
            argumentType: ArgumentTypeName.PCD,
            value: await SemaphoreIdentityPCDPackage.serialize(
              await SemaphoreIdentityPCDPackage.prove({
                identity: stateContext.getState().identity
              })
            )
          },
          signedMessage: {
            argumentType: ArgumentTypeName.String,
            value: ISSUANCE_STRING
          }
        })
      );

      saveCheckinCredential(cachedSignaturePCD);
    }

    return await requestCheckTicketById(appConfig.zupassServer, {
      ticketId,
      signature: cachedSignaturePCD
    });
  }
}

export async function devconnectCheckInByIdWithOffline(
  ticketId: string,
  stateContext: StateContextValue
): Promise<CheckTicketInByIdResult> {
  if (DEBUG_FORCE_OFFLINE || stateContext.getState().offline) {
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

    checkinOfflineDevconnectTicket(ticketId, stateContext);

    return {
      success: true,
      value: undefined
    };
  } else {
    let cachedSignaturePCD = loadCheckinCredential();
    if (!cachedSignaturePCD) {
      cachedSignaturePCD = await SemaphoreSignaturePCDPackage.serialize(
        await SemaphoreSignaturePCDPackage.prove({
          identity: {
            argumentType: ArgumentTypeName.PCD,
            value: await SemaphoreIdentityPCDPackage.serialize(
              await SemaphoreIdentityPCDPackage.prove({
                identity: stateContext.getState().identity
              })
            )
          },
          signedMessage: {
            argumentType: ArgumentTypeName.String,
            value: ISSUANCE_STRING
          }
        })
      );

      saveCheckinCredential(cachedSignaturePCD);
    }

    return await requestCheckInById(appConfig.zupassServer, {
      ticketId,
      checkerProof: cachedSignaturePCD
    });
  }
}
