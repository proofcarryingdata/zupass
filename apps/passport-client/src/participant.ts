import {
  DateRange,
  ParticipantRole,
  ZuParticipant,
} from "@pcd/passport-interface";
import { config } from "./config";
import { Dispatcher } from "./dispatch";

// Starts polling the participant record, in the background.
export async function pollParticipant(
  self: ZuParticipant,
  dispatch: Dispatcher
) {
  const url = `${config.passportServer}/zuzalu/participant/${self.uuid}`;
  console.log(`[USER_POLL] Polling ${url}`);
  try {
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 404) {
        // this participant was previously a valid participant, but now the
        // app isn't able to find them, so we should log the user out of this passport.
        dispatch({ type: "participant-invalid" });
      }
      console.log("[USER_POLL] Participant not found, skipping update");
      return;
    }

    const participant = await response.json();
    await dispatch({ type: "set-self", self: participant });
  } catch (e) {
    console.error("[USER_POLL] Error polling participant", e);
  }
}

export function getVisitorStatus(participant?: ZuParticipant):
  | {
      isVisitor: boolean;
      isDateRangeValid: boolean;
    }
  | undefined {
  if (participant === undefined) return undefined;

  if (participant.role === ParticipantRole.Visitor) {
    return {
      isVisitor: true,
      isDateRangeValid: isDateInRanges(
        new Date(),
        participant.visitor_date_ranges
      ),
    };
  }

  return { isVisitor: false, isDateRangeValid: true };
}

function isDateInRanges(date: Date, ranges: DateRange[]) {
  for (const range of ranges) {
    const from = new Date(range.date_from).getTime();
    const to = new Date(range.date_to).getTime();
    const testDate = date.getTime();

    if (testDate <= to && testDate >= from) {
      return true;
    }
  }

  return false;
}
