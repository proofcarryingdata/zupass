import _ from "lodash";
import { DevconnectPretixTicket } from "../database/models";

/**
 * Sometimes the ticket we load from pretix is updated.
 * This function detects these changes.
 */
export function pretixTicketsDifferent(
  oldTicket: DevconnectPretixTicket,
  newTicket: DevconnectPretixTicket
): boolean {
  if (oldTicket.ticket_name !== newTicket.ticket_name) {
    return true;
  }

  if (!_.isEqual(oldTicket.event_id, newTicket.event_id)) {
    return true;
  }

  if (oldTicket.name !== newTicket.name) {
    return true;
  }

  return false;
}

/**
 * Converts list of users to map indexed by email address.
 */
export function ticketsToMapByEmail(
  users: DevconnectPretixTicket[]
): Map<string, DevconnectPretixTicket> {
  return new Map(users.map((user) => [user.email, user]));
}
