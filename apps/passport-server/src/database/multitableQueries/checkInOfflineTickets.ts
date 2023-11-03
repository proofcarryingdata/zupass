import { Pool } from "postgres-pool";
import { logger } from "../../util/logger";
import { DevconnectPretixTicketDBWithEmailAndItem } from "../models";
import {
  fetchDevconnectPretixTicketByTicketId,
  fetchDevconnectSuperusersForEmail
} from "../queries/devconnect_pretix_tickets/fetchDevconnectPretixTicket";
import { consumeDevconnectPretixTicket } from "../queries/devconnect_pretix_tickets/updateDevconnectPretixTicket";
import { fetchUserByCommitment } from "../queries/users";

/**
 * Attempts to check in the given devconnect tickets on behalf of the user
 * with the given commitment. Does not error in cases where the user does not
 * have permission, or the ticket does not exist, etc., in order to be robust
 * to ticketing settings having changed since the user was last online.
 */
export async function checkInOfflineTickets(
  dbPool: Pool,
  checkerCommitment: string,
  checkedOfflineInDevconnectTicketIDs: string[]
): Promise<void> {
  logger(
    `[OFFLINE_CHECKIN] user ${checkerCommitment} attempting to check in ticket ids ${checkedOfflineInDevconnectTicketIDs}`
  );
  const user = await fetchUserByCommitment(dbPool, checkerCommitment);
  if (!user) {
    throw new Error(`no user found for commitment ${checkerCommitment}`);
  }

  const superuserTickets = await fetchDevconnectSuperusersForEmail(
    dbPool,
    user.email
  );
  logger(
    `[OFFLINE_CHECKIN] ${checkerCommitment} has ${superuserTickets.length} superuser tickets` +
      ` for events ${JSON.stringify(
        superuserTickets.map((t) => t.pretix_events_config_id)
      )}`
  );
  const checkableEventIds = new Set(
    superuserTickets.map((t) => t.pretix_events_config_id)
  );

  logger(
    "[OFFLINE_CHECKIN] set of checkable event ids",
    Array.from(checkableEventIds)
  );

  const tickets = await Promise.all(
    checkedOfflineInDevconnectTicketIDs.map((id) =>
      fetchDevconnectPretixTicketByTicketId(dbPool, id)
    )
  );

  const existingTickets = tickets.filter(
    (t) => !!t
  ) as DevconnectPretixTicketDBWithEmailAndItem[];

  for (const ticket of existingTickets) {
    if (!checkableEventIds.has(ticket.pretix_events_config_id)) {
      logger(
        `[OFFLINE_CHECKIN] ${checkerCommitment} attempted to check in ticket` +
          ` ${ticket.id} with event id ${ticket.pretix_events_config_id} but did not have permission`
      );
      continue;
    }

    if (ticket.is_consumed) {
      logger(
        `[OFFLINE_CHECKIN] ${checkerCommitment} attempted to check in ticket` +
          ` ${ticket.id} but it was already checked in at ${
            ticket.pretix_checkin_timestamp ?? ticket.zupass_checkin_timestamp
          } by ${ticket.checker}`
      );
    }

    await consumeDevconnectPretixTicket(dbPool, ticket.id, user.email);
    logger(
      `[OFFLINE_CHECKIN] ${checkerCommitment} checked in ticket ${ticket.id}`
    );
  }
}
