import _ from "lodash";
import { Pool } from "postgres-pool";
import { DevconnectPretixTicketDB, ZuconnectTicketDB } from "../models";
import {
  fetchDevconnectPretixTicketsByEvent,
  fetchDevconnectSuperusersForEmail
} from "../queries/devconnect_pretix_tickets/fetchDevconnectPretixTicket";
import { fetchUserByUUID } from "../queries/users";
import {
  fetchAllZuconnectTickets,
  fetchZuconnectTicketsByEmail
} from "../queries/zuconnect/fetchZuconnectTickets";

export async function fetchOfflineTicketsForChecker(
  dbPool: Pool,
  userUUID: string
): Promise<OfflineTickets> {
  return {
    devconnectTickets: await fetchOfflineDevconnectTickets(dbPool, userUUID),
    zuconnectTickets: await fetchOfflineZuconnectTickets(dbPool, userUUID)
  };
}

export async function fetchOfflineZuconnectTickets(
  dbPool: Pool,
  userUUID: string
): Promise<OfflineZuconnectTicket[]> {
  const user = await fetchUserByUUID(dbPool, userUUID);
  if (!user) {
    throw new Error(`no user found for uuid ${userUUID}`);
  }

  const zuconnectTicket = await fetchZuconnectTicketsByEmail(
    dbPool,
    user.email
  );

  // only attendees of zuconnect get these offline tickets
  if (!zuconnectTicket) {
    return [];
  }

  const allZuconnectTickets = await fetchAllZuconnectTickets(dbPool);
  return allZuconnectTickets.map(zuconnectTicketToOfflineTicket);
}

export async function fetchOfflineDevconnectTickets(
  dbPool: Pool,
  userUUID: string
): Promise<OfflineDevconnectTicket[]> {
  const user = await fetchUserByUUID(dbPool, userUUID);
  if (!user) {
    throw new Error(`no user found for uuid ${userUUID}`);
  }

  const superuserTickets = await fetchDevconnectSuperusersForEmail(
    dbPool,
    user.email
  );

  const devconnectEventIds = superuserTickets.map(
    (t) => t.pretix_events_config_id
  );

  const tickets = _.flatten(
    await Promise.all(
      devconnectEventIds.map((id) =>
        fetchDevconnectPretixTicketsByEvent(dbPool, id)
      )
    )
  ).map(devconnectTicketToOfflineTicket);

  return tickets;
}

function devconnectTicketToOfflineTicket(
  ticket: DevconnectPretixTicketDB
): OfflineDevconnectTicket {
  return { id: ticket.id };
}

function zuconnectTicketToOfflineTicket(
  ticket: ZuconnectTicketDB
): OfflineZuconnectTicket {
  return { id: ticket.id };
}

export interface OfflineTickets {
  devconnectTickets: OfflineDevconnectTicket[];
  zuconnectTickets: OfflineZuconnectTicket[];
}

export interface OfflineDevconnectTicket {
  id: string;
}

export interface OfflineZuconnectTicket {
  id: string;
}
