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
  logger(dbPool, checkerCommitment, checkedOfflineInDevconnectTicketIDs);
  const user = await fetchUserByCommitment(dbPool, checkerCommitment);
  if (!user) {
    throw new Error(`no user found for commitment ${checkerCommitment}`);
  }

  const superuserTickets = await fetchDevconnectSuperusersForEmail(
    dbPool,
    user.email
  );

  const checkableItemIds = new Set(
    await fetchItemInfoIdsBelongingToEvents(
      dbPool,
      superuserTickets.map((t) => t.devconnect_pretix_items_info_id)
    )
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
    if (checkableItemIds.has(ticket.devconnect_pretix_items_info_id)) {
      await consumeDevconnectPretixTicket(dbPool, ticket.id, user.email);
    }
  }
}
