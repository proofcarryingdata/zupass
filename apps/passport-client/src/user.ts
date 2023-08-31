import {
  DateRange,
  FullDateRange,
  User,
  ZuzaluUserRole
} from "@pcd/passport-interface";
import { logToServer } from "./api/logApi";
import { requestUser } from "./api/user";
import { Dispatcher } from "./dispatch";

// Starts polling the user from the server, in the background.
export async function pollUser(self: User, dispatch: Dispatcher) {
  try {
    const response = await requestUser(self.uuid);
    if (!response.ok) {
      if (response.status === 404) {
        // this user was previously a valid user, but now the
        // app isn't able to find them, so we should log the
        // user out of this passport.
        logToServer("invalid-user", { reason: 404 });
        dispatch({ type: "participant-invalid" });
      }
      console.log("[USER_POLL] User not found, skipping update");
      return;
    }

    const user = await response.json();
    await dispatch({ type: "set-self", self: user });
  } catch (e) {
    console.error("[USER_POLL] Error polling user", e);
  }
}

export enum VisitorStatus {
  Current,
  Upcoming,
  Expired
}

/**
 * If the user is a visitor, they must have a visitor ticket that is
 * active at the current moment to be a 'valid' visitor. This function
 * checks the validity of the visitor, if they are a visitor.
 */
export function getVisitorStatus(user?: User):
  | {
      isVisitor: true;
      status: VisitorStatus;
    }
  | { isVisitor: false }
  | undefined {
  if (user === undefined) return undefined;

  const now = new Date();

  if (user.role === ZuzaluUserRole.Visitor) {
    if (isDateInRanges(now, user.visitor_date_ranges)) {
      return {
        isVisitor: true,
        status: VisitorStatus.Current
      };
    }

    if (anyUpcomingDateRange(now, user.visitor_date_ranges)) {
      return { isVisitor: true, status: VisitorStatus.Upcoming };
    }

    return {
      isVisitor: true,
      status: VisitorStatus.Expired
    };
  }

  return { isVisitor: false };
}

const ZUZALU_START_DATE = "2023-03-24";
const ZUZALU_END_DATE = "2023-05-26";

export function sanitizeDateRanges(ranges?: DateRange[]): FullDateRange[] {
  if (!ranges) return [];

  const sanitized = ranges.map(
    (range) =>
      ({
        date_from: range.date_from ?? ZUZALU_START_DATE,
        date_to: range.date_to ?? ZUZALU_END_DATE
      }) satisfies FullDateRange
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

export function anyUpcomingDateRange(date: Date, ranges: DateRange[]): boolean {
  const sanitizedRanges = sanitizeDateRanges(ranges);
  const now = date.getTime();

  for (const range of sanitizedRanges) {
    const start = new Date(range.date_from).getTime();
    const end = new Date(range.date_from).getTime();

    if (now < start || now < end) {
      return true;
    }
  }

  return false;
}
