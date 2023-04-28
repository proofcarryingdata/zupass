import _ from "lodash";
import { PretixParticipant } from "../database/models";

/**
 * Sometimes the participant we load from pretix is updated.
 * This function detects these changes.
 */
export function participantUpdatedFromPretix(
  oldParticipant: PretixParticipant,
  newParticipant: PretixParticipant
): boolean {
  if (oldParticipant.role !== newParticipant.role) {
    return true;
  }

  if (
    !_.isEqual(
      oldParticipant.visitor_date_ranges,
      newParticipant.visitor_date_ranges
    )
  ) {
    return true;
  }

  return false;
}
