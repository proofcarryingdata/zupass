import {
  DateRange,
  FullDateRange,
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

/**
 * If the user is a visitor, they must have a visitor ticket that is
 * active at the current moment to be a 'valid' visitor. This function
 * checks the validity of the visitor, if they are a visitor.
 */
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

const ZUZALU_START_DATE = "2023-03-24";
const ZUZALU_END_DATE = "2023-05-26";

export function sanitizeDateRanges(ranges?: DateRange[]): FullDateRange[] {
  if (!ranges) return [];

  const sanitized = ranges.map(
    (range) =>
      ({
        date_from: range.date_from ?? ZUZALU_START_DATE,
        date_to: range.date_to ?? ZUZALU_END_DATE,
      } satisfies FullDateRange)
  );

  sanitized.sort((a, b) => {
    return new Date(a.date_from).getTime() - new Date(b.date_from).getTime();
  });

  return sanitized;
}

export function isDateInRanges(date: Date, ranges: DateRange[]): boolean {
  const sanitizedRanges = sanitizeDateRanges(ranges);

  for (const range of sanitizedRanges) {
    const from = new Date(range.date_from).getTime();
    const to = new Date(range.date_to).getTime();
    const testDate = date.getTime();

    if (testDate <= to && testDate >= from) {
      return true;
    }
  }

  return false;
}
