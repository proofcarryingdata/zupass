/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  OfflineDevconnectTicket,
  OfflineTickets
} from "@pcd/passport-interface";
import { Pool } from "postgres-pool";
import { DevconnectPretixTicketDBWithEmailAndItem } from "../models";

/**
 * Fetches the relevant tickets for the given user. Relevant tickets are
 * defined as follows:
 *
 * - if a user has a zuconnect ticket, then all zuconnect tickets are relevant
 * - if a user has a zuzalu ticket, then all zuconnect tickets are relevant
 * - for each devconnect event that this user has a superuser ticket to, all
 *   tickets belonging to that event are relevant.
 */
export async function fetchOfflineTicketsForChecker(
  dbPool: Pool,
  userCommitment: string
): Promise<OfflineTickets> {
  const devconnectTickets = await fetchOfflineDevconnectTickets(
    dbPool,
    userCommitment
  );

  const result = {
    devconnectTickets
  };

  return result;
}

async function fetchOfflineDevconnectTickets(
  dbPool: Pool,
  userCommitment: string
): Promise<OfflineDevconnectTicket[]> {
  return [];
  // const user = await fetchUserByCommitment(dbPool, userCommitment);
  // if (!user) {
  //   throw new Error(`no user found for commitment ${userCommitment}`);
  // }

  // const superuserTickets = await fetchDevconnectSuperusersForEmail(
  //   dbPool,
  //   user.email
  // );

  // const devconnectEventIds = superuserTickets.map(
  //   (t) => t.pretix_events_config_id
  // );

  // const tickets = _.flatten(
  //   await Promise.all(
  //     devconnectEventIds.map((id) =>
  //       fetchDevconnectPretixTicketsByEvent(dbPool, id)
  //     )
  //   )
  // ).map(devconnectTicketToOfflineTicket);

  // return tickets;
}

function devconnectTicketToOfflineTicket(
  ticket: DevconnectPretixTicketDBWithEmailAndItem
): OfflineDevconnectTicket {
  return {
    id: ticket.id,
    checkinTimestamp:
      ticket.pretix_checkin_timestamp?.toISOString() ??
      ticket.zupass_checkin_timestamp?.toISOString(),
    checker: ticket.checker,
    attendeeEmail: ticket.email,
    attendeeName: ticket.full_name,
    eventName: ticket.event_name,
    ticketName: ticket.item_name,
    is_consumed: ticket.is_consumed
  };
}
