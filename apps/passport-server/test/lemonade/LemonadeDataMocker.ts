import { randomUUID } from "crypto";
import {
  LemonadeEvent,
  LemonadeTicket,
  LemonadeTicketTier,
  LemonadeUser
} from "../../src/apis/lemonade/lemonadeAPI";
import { randomEmail } from "../util/util";

export class LemonadeDataMocker {
  private events: LemonadeEvent[];
  private users: LemonadeUser[];

  public constructor() {
    this.events = [];
    this.users = [];
  }

  public getUsersEvents(userId: string): LemonadeEvent[] {
    return this.events.filter((e) => {
      return e.permissionedUserIds.includes(userId);
    });
  }

  public getEvent(eventId: string): LemonadeEvent | undefined {
    return this.events.find((e) => e.id === eventId);
  }

  public getTier(
    eventId: string,
    tierId: string
  ): LemonadeTicketTier | undefined {
    const event = this.getEvent(eventId);

    if (!event) {
      return undefined;
    }

    return event.tiers.find((t) => t.id === tierId);
  }

  public addTicket(
    tierId: string,
    eventId: string,
    attendeeName: string
  ): LemonadeTicket {
    const newTicket: LemonadeTicket = {
      checkedIn: false,
      eventId,
      id: randomUUID(),
      email: randomEmail(),
      name: attendeeName,
      tierId
    };

    const event = this.getEvent(eventId);

    if (!event) {
      throw new Error(`can't add ticket to event that doesn't exist`);
    }

    const tier = this.getTier(eventId, tierId);

    if (!tier) {
      throw new Error(`can't add ticket to tier that doesn't exist`);
    }

    event.tickets.push(newTicket);

    return newTicket;
  }

  public addEvent(name: string): LemonadeEvent {
    const newEvent: LemonadeEvent = {
      id: randomUUID(),
      name: name,
      tickets: [],
      tiers: [],
      permissionedUserIds: []
    };
    this.events.push(newEvent);
    return newEvent;
  }

  public addTier(eventId: string, name: string): LemonadeTicketTier {
    const newTier: LemonadeTicketTier = {
      id: randomUUID(),
      name
    };
    const event = this.events.find((e) => e.id === eventId);
    if (!event) {
      throw new Error(`unable to find event with id ${eventId}`);
    }
    const existingTier = event.tiers.find((t) => t.name === name);
    if (existingTier) {
      throw new Error(
        `event ${eventId} already has a ticket tier with name ${name}`
      );
    }
    event.tiers.push(newTier);
    return newTier;
  }

  public addUser(name?: string): LemonadeUser {
    const newUser: LemonadeUser = {
      email: randomEmail(),
      id: randomUUID(),
      apiKey: randomUUID(),
      name: name ?? randomUUID()
    };
    this.users.push(newUser);
    return newUser;
  }

  public getUser(userId: string): LemonadeUser | undefined {
    return this.users.find((u) => u.id === userId);
  }

  public getUserByApiKey(apiKey: string): LemonadeUser | undefined {
    return this.users.find((u) => u.apiKey === apiKey);
  }

  public permissionUser(userId: string, eventId: string): void {
    const user = this.getUser(userId);
    const event = this.getEvent(eventId);

    if (!user) {
      throw new Error(`user ${userId} does not exist`);
    }

    if (!event) {
      throw new Error(`event ${eventId} does not exist`);
    }

    if (event.permissionedUserIds.includes(user.id)) {
      throw new Error(
        `event ${eventId} already has user ${userId} as an admin`
      );
    }

    event.permissionedUserIds.push(userId);
  }
}
