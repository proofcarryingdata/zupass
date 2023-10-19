import { DevconnectPretixCheckin } from "../apis/devconnect/devconnectPretixAPI";
import { DevconnectPretixTicket } from "../database/models";

/**
 * Sometimes the ticket we load from pretix is updated.
 * This function detects these changes.
 */
export function pretixTicketsDifferent(
  oldTicket: DevconnectPretixTicket,
  newTicket: DevconnectPretixTicket
): boolean {
  if (oldTicket.full_name !== newTicket.full_name) {
    return true;
  }

  if (oldTicket.is_deleted !== newTicket.is_deleted) {
    return true;
  }

  if (oldTicket.secret !== newTicket.secret) {
    return true;
  }

  if (oldTicket.is_consumed !== newTicket.is_consumed) {
    return true;
  }

  if (oldTicket.email !== newTicket.email) {
    return true;
  }

  if (
    oldTicket.pretix_checkin_timestamp !== newTicket.pretix_checkin_timestamp
  ) {
    // The inequality might be because one of these is null, but it might
    // also be because both are date objects, in which case we need a
    // stricter check.
    if (
      oldTicket.pretix_checkin_timestamp instanceof Date &&
      newTicket.pretix_checkin_timestamp instanceof Date
    ) {
      if (
        oldTicket.pretix_checkin_timestamp.getTime() !==
        newTicket.pretix_checkin_timestamp.getTime()
      ) {
        return true;
      }
    } else {
      return true;
    }
  }

  if (oldTicket.pretix_events_config_id !== newTicket.pretix_events_config_id) {
    return true;
  }

  return false;
}

export function mostRecentCheckinEvent(
  checkins: DevconnectPretixCheckin[]
): DevconnectPretixCheckin | undefined {
  // The string comparison is in the sort is safe because ISO date
  // strings sort lexicographically.
  return checkins.sort((a, b) => (a.datetime > b.datetime ? 1 : -1)).at(-1);
}
