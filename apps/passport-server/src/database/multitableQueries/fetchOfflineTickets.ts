import {
  OfflineDevconnectTicket,
  OfflineTickets,
  OfflineZuconnectTicket
} from "@pcd/passport-interface";
import _ from "lodash";
import { Pool } from "postgres-pool";
import { DevconnectPretixTicketDB, ZuconnectTicketDB } from "../models";
import {
  fetchDevconnectPretixTicketsByEvent,
  fetchDevconnectSuperusersForEmail
} from "../queries/devconnect_pretix_tickets/fetchDevconnectPretixTicket";
import { fetchUserByCommitment } from "../queries/users";
import {
  fetchAllZuconnectTickets,
  fetchZuconnectTicketsByEmail
} from "../queries/zuconnect/fetchZuconnectTickets";

export async function fetchOfflineTicketsForChecker(
  dbPool: Pool,
  userCommitment: string
): Promise<OfflineTickets> {
  const result = {
    devconnectTickets: await fetchOfflineDevconnectTickets(
      dbPool,
      userCommitment
    ),
    zuconnectTickets: await fetchOfflineZuconnectTickets(dbPool, userCommitment)
  };

  return result;
}

async function fetchOfflineZuconnectTickets(
  dbPool: Pool,
  userCommitment: string
): Promise<OfflineZuconnectTicket[]> {
  const user = await fetchUserByCommitment(dbPool, userCommitment);
  if (!user) {
    throw new Error(`no user found for uuid ${userCommitment}`);
  }

  const zuconnectTickets = await fetchZuconnectTicketsByEmail(
    dbPool,
    user.email
  );

  // only attendees of zuconnect get these offline tickets
  if (zuconnectTickets.length === 0) {
    return [];
  }

  const allZuconnectTickets = await fetchAllZuconnectTickets(dbPool);
  return allZuconnectTickets.map(zuconnectTicketToOfflineTicket);
}

async function fetchOfflineDevconnectTickets(
  dbPool: Pool,
  userCommitment: string
): Promise<OfflineDevconnectTicket[]> {
  const user = await fetchUserByCommitment(dbPool, userCommitment);
  if (!user) {
    throw new Error(`no user found for commitment ${userCommitment}`);
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
