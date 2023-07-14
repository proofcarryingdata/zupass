import { DevconnectPretixTicket } from "../database/models";

/**
 * Sometimes the ticket we load from pretix is updated.
 * This function detects these changes.
 */
export function pretixTicketsDifferent(
  oldTicket: DevconnectPretixTicket,
  newTicket: DevconnectPretixTicket
): boolean {
  if (oldTicket.is_deleted !== newTicket.is_deleted) {
    return true;
  }

  if (oldTicket.full_name !== newTicket.full_name) {
    return true;
  }

  return false;
}

// Delimiter between strings in a Map key. This should be
// a character that is not used in the strings being joined
// together.
const KEY_DELIMITER = ",";

// TODO: validation and sanitization
export type EmailAndItemInfoID = string;

/**
 * Gets the key needed to index into a Map<EmailAndItemInfoID, DevconnectPretixTicket>.
 */
export function getEmailAndItemKey(
  ticket: DevconnectPretixTicket
): EmailAndItemInfoID {
  return [ticket.email, ticket.devconnect_pretix_items_info_id].join(
    KEY_DELIMITER
  );
}

/**
 * Converts list of users to map indexed by email address and item info ID.
 */
export function ticketsToMapByEmailAndItem(
  tickets: DevconnectPretixTicket[]
): Map<EmailAndItemInfoID, DevconnectPretixTicket> {
  return new Map(tickets.map((t) => [getEmailAndItemKey(t), t]));
}
