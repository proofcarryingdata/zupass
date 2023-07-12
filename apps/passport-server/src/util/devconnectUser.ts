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
  if (!_.isEqual(new Set(oldTicket.item_ids), new Set(newTicket.item_ids))) {
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
