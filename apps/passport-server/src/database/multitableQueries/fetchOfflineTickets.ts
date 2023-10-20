import {
  KnownTicketGroup,
  OfflineDevconnectTicket,
  OfflineSecondPartyTicket,
  OfflineTickets
} from "@pcd/passport-interface";
import _ from "lodash";
import { Pool } from "postgres-pool";
import { ZUPASS_TICKET_PUBLIC_KEY_NAME } from "../../services/issuanceService";
import { zuzaluRoleToProductId } from "../../util/zuzaluUser";
import {
  DevconnectPretixTicketDBWithEmailAndItem,
  LoggedInZuzaluUser,
  ZuconnectTicketDB
} from "../models";
import {
  fetchDevconnectPretixTicketsByEvent,
  fetchDevconnectSuperusersForEmail
} from "../queries/devconnect_pretix_tickets/fetchDevconnectPretixTicket";
import { fetchUserByCommitment } from "../queries/users";
import {
  fetchAllZuconnectTickets,
  fetchZuconnectTicketsByEmail
} from "../queries/zuconnect/fetchZuconnectTickets";
import {
  fetchAllLoggedInZuzaluUsers,
  fetchZuzaluUser
} from "../queries/zuzalu_pretix_tickets/fetchZuzaluUser";

export async function fetchOfflineTicketsForChecker(
  dbPool: Pool,
  userCommitment: string
): Promise<OfflineTickets> {
  const devconnectTickets = await fetchOfflineDevconnectTickets(
    dbPool,
    userCommitment
  );
  const zuconnectTickets = await fetchOfflineZuconnectTickets(
    dbPool,
    userCommitment
  );
  const zuzaluTickets = await fetchOfflineZuzaluTickets(dbPool, userCommitment);

  const result = {
    devconnectTickets,
    secondPartyTickets: [...zuconnectTickets, ...zuzaluTickets]
  };

  return result;
}

async function fetchOfflineZuzaluTickets(
  dbPool: Pool,
  userCommitment: string
): Promise<OfflineSecondPartyTicket[]> {
  const user = await fetchUserByCommitment(dbPool, userCommitment);
  if (!user) {
    throw new Error(`no user found for uuid ${userCommitment}`);
  }

  const zuzaluTicket = await fetchZuzaluUser(dbPool, user.email);

  // only attendees of zuzalu get offline zuzalu tickets
  if (!zuzaluTicket) {
    return [];
  }

  const allZuconnectTickets = await fetchAllLoggedInZuzaluUsers(dbPool);
  return allZuconnectTickets.map(zuzaluUserToOfflineTicket);
}

async function fetchOfflineZuconnectTickets(
  dbPool: Pool,
  userCommitment: string
): Promise<OfflineSecondPartyTicket[]> {
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
    ticketName: ticket.item_name
  };
}

function zuconnectTicketToOfflineTicket(
  ticket: ZuconnectTicketDB
): OfflineSecondPartyTicket {
  return {
    id: ticket.id,
    group: KnownTicketGroup.Zuconnect23,
    publicKeyName: ZUPASS_TICKET_PUBLIC_KEY_NAME,
    productId: ticket.product_id
  };
}

function zuzaluUserToOfflineTicket(
  ticket: LoggedInZuzaluUser
): OfflineSecondPartyTicket {
  return {
    id: ticket.uuid,
    group: KnownTicketGroup.Zuzalu23,
    publicKeyName: ZUPASS_TICKET_PUBLIC_KEY_NAME,
    productId: zuzaluRoleToProductId(ticket.role)
  };
}
