import { LemonadeDataMocker } from "../../../test/lemonade/LemonadeDataMocker";
import { MockLemonadeAPI } from "../../../test/lemonade/MockLemonadeAPI";

/**
 * Used in tests.
 */
export interface LemonadeUser {
  id: string;
  email: string;
  apiKey: string;
  name: string;
}

/**
 * A lemonade ticket as represented by the upcoming Lemonade API. It's
 * still t.b.d so this is my best guess for now.
 */
export interface LemonadeTicket {
  id: string;
  name: string;
  email: string;
  eventId: string;
  tierId: string;
  checkedIn: boolean;
  checkerEmail?: string;
}

/**
 * A lemonade ticket tier as represented by the upcoming Lemonade API. It's
 * still t.b.d so this is my best guess for now.
 */
export interface LemonadeTicketTier {
  name: string;
  id: string;
}

/**
 * A lemonade event as represented by the upcoming Lemonade API. It's
 * still t.b.d so this is my best guess for now.
 */
export interface LemonadeEvent {
  id: string;
  name: string;
  tickets: LemonadeTicket[];
  tiers: LemonadeTicketTier[];
  permissionedUserIds: string[];
}

/**
 * TODO: implement to match the actual API
 */
export interface ILemonadeAPI {
  loadEvents(apiKey: string): Promise<LemonadeEvent[]>;
  checkinTicket(
    apiKey: string,
    eventId: string,
    ticketId: string
  ): Promise<void>;
  // TODO: fill in the other methods. This is what is planned so far:
  // - API Key scoped to an ‘account’, which has read/write permissions to
  //   the appropriate events. E.g. can read/write events that are owned/co-owned by the account.
  // - GET product types for a given event
  // - GET tickets for a given event, which will include
  //     - Attendee name
  //     - Attendee email
  //     - Product type (7-day, early bird, GA, etc)
  //     - Checked-in status
  // - POST Check-in (and potentially check-out)
}

/**
 * TODO: replace with production version once it exists. We have a placeholder
 * so that {@link GenericIssuanceService} is instantiated in non-testing environments.
 */
export function getLemonadeAPI(): ILemonadeAPI {
  const mockData = new LemonadeDataMocker();
  return new MockLemonadeAPI(mockData);
}
