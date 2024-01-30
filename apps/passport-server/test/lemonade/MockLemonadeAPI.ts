import {
  ILemonadeAPI,
  LemonadeEvent
} from "../../src/apis/lemonade/lemonadeAPI";
import { LemonadeDataMocker } from "./LemonadeDataMocker";

/**
 * Wraps a {@link LemonadeDataMocker} for testing purposes.
 */
export class MockLemonadeAPI implements ILemonadeAPI {
  private data: LemonadeDataMocker;

  public constructor(data: LemonadeDataMocker) {
    this.data = data;
  }

  public async loadEvents(apiKey: string): Promise<LemonadeEvent[]> {
    const user = this.data.getUserByApiKey(apiKey);

    if (!user) {
      throw new Error(`no user with api key ${apiKey} found`);
    }

    return this.data.getUsersEvents(user.id);
  }

  public async checkinTicket(
    apiKey: string,
    eventId: string,
    ticketId: string
  ): Promise<void> {
    const user = this.data.getUserByApiKey(apiKey);

    if (!user) {
      throw new Error(`no user with api key ${apiKey} found`);
    }

    const usersEvents = this.data.getUsersEvents(user.id);
    const event = usersEvents.find((e) => e.id === eventId);

    if (!event) {
      throw new Error(`user ${user.id} cannot view event ${eventId}`);
    }

    const ticket = event.tickets.find((t) => t.id === ticketId);

    if (!ticket) {
      throw new Error(`could not find ticket with id ${ticketId}`);
    }

    if (ticket.checkedIn) {
      throw new Error(`ticket ${ticket.id} is already checked in`);
    }

    ticket.checkedIn = true;
  }
}
