import { Pool } from "postgres-pool";
import { logger } from "../../util/logger";
import { DevconnectPretixTicketDBWithEmailAndItem } from "../models";
import {
  fetchDevconnectPretixTicketByTicketId,
  fetchDevconnectSuperusersForEmail,
  fetchProductIdsBelongingToEvents as fetchItemInfoIdsBelongingToEvents
} from "../queries/devconnect_pretix_tickets/fetchDevconnectPretixTicket";
import { consumeDevconnectPretixTicket } from "../queries/devconnect_pretix_tickets/updateDevconnectPretixTicket";
import { fetchUserByCommitment } from "../queries/users";

export async function checkInOfflineTickets(
  dbPool: Pool,
  checkerCommitment: string,
  checkedOfflineInDevconnectTicketIDs: string[]
): Promise<void> {
  logger(
    `[OFFLINE_CHECKIN] use ${checkerCommitment} attempting to check in ${checkedOfflineInDevconnectTicketIDs}`
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

  const checkableItemIds = new Set(
    await fetchItemInfoIdsBelongingToEvents(
      dbPool,
      superuserTickets.map((t) => t.pretix_events_config_id)
    )
  );
  logger(
    `[OFFLINE_CHECKIN] ${checkerCommitment} can check in these products ${JSON.stringify(
      Array.from(checkableItemIds)
    )}`
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
    if (!checkableItemIds.has(ticket.devconnect_pretix_items_info_id)) {
      logger(
        `[OFFLINE_CHECKIN] ${checkerCommitment} attempted to check in ticket` +
          ` ${ticket.id} with item id ${ticket.devconnect_pretix_items_info_id} but did not have permission`
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
