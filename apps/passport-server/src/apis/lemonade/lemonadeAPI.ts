import { LemonadeDataMocker } from "../../../test/lemonade/LemonadeDataMocker";
import { MockLemonadeAPI } from "../../../test/lemonade/MockLemonadeAPI";

export interface LemonadeUser {
  id: string;
  email: string;
  apiKey: string;
  name: string;
}

/**
 * A lemonade ticket as represented by the upcoming Lemonade API. It's
 * still t.b.d so this is my best guess for now.
 *
 * TODO:
 * - probably move to different file
 */
export interface LemonadeTicket {
  id: string;
  name: string;
  email: string;
  eventId: string;
  tierId: string;
  checkedIn: boolean;
}

/**
 * A lemonade ticket tier as represented by the upcoming Lemonade API. It's
 * still t.b.d so this is my best guess for now.
 *
 * TODO:
 * - probably move to different file
 */
export interface LemonadeTicketTier {
  name: string;
  id: string;
}

/**
 * A lemonade event as represented by the upcoming Lemonade API. It's
 * still t.b.d so this is my best guess for now.
 *
 * TODO:
 * - probably move to different file
 */
export interface LemonadeEvent {
  id: string;
  name: string;
  tickets: LemonadeTicket[];
  tiers: LemonadeTicketTier[];
  permissionedUserIds: string[];
}

/**
 * TODO:
 * - probably move to different file
 */
export interface ILemonadeAPI {
  loadEvents(apiKey: string): Promise<LemonadeEvent[]>;
  checkinTicket(
    apiKey: string,
    eventId: string,
    ticketId: string
  ): Promise<void>;
  // TODO: fill in the other methods. This is what Richard
  // has communicated to them:
  // - API Key scoped to an ‘account’, which has read/write permissions to the appropriate events. E.g. can read/write events that are owned/co-owned by the account.
  // - GET product types for a given event
  // - GET tickets for a given event, which will include
  //     - Attendee name
  //     - Attendee email
  //     - Product type (7-day, early bird, GA, etc)
  //     - Checked-in status
  // - POST Check-in (and potentially check-out)
}

/**
 * TODO: replace with production version once it exists
 */
export function getLemonadeAPI(): ILemonadeAPI {
  const mockData = new LemonadeDataMocker();
  const edgeCity = mockData.addEvent("edge city");
  const ivan = mockData.addUser("ivan");
  const ga = mockData.addTier(edgeCity.id, "ga");
  mockData.addTicket(ga.id, edgeCity.id, ivan.name);
  mockData.permissionUser(ivan.id, edgeCity.id);
  return new MockLemonadeAPI(mockData);
}
