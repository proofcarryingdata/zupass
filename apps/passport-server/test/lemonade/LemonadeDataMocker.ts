import { ONE_DAY_MS } from "@pcd/util";
import { randomUUID } from "crypto";
import {
  LemonadeEvent,
  LemonadeTicket,
  LemonadeTicketType
} from "../../src/apis/lemonade/lemonadeAPI";

export interface LemonadeUser {
  __typename: "User";
  _id: string;
  name: string;
  first_name: string;
  last_name: string;
  email: string;
}

class LemonadeAccount {
  private events: Map<string, LemonadeEvent>;
  private ticketTypes: Map<string, Map<string, LemonadeTicketType>>;
  private tickets: Map<string, Map<string, LemonadeTicket>>;
  private users: Map<string, LemonadeUser>;

  public constructor(users: Map<string, LemonadeUser>) {
    this.events = new Map();
    this.ticketTypes = new Map();
    this.tickets = new Map();
    // Store reference to user map shared between all accounts
    this.users = users;
  }

  public addEvent(title: string): LemonadeEvent {
    const KEBAB_REGEX = /[A-Z\u00C0-\u00D6\u00D8-\u00DE]/g;
    const event: LemonadeEvent = {
      title,
      description: title,
      slug: title.replace(KEBAB_REGEX, (match) => "-" + match.toLowerCase()),
      _id: randomUUID(),
      start: new Date().toISOString(),
      end: new Date(Date.now() + ONE_DAY_MS * 7).toISOString()
    };

    this.events.set(event._id, event);
    return event;
  }

  public addTicketType(eventId: string, title: string): LemonadeTicketType {
    if (!this.events.has(eventId)) {
      throw new Error(`Can't add ticket type to non-existent event ${eventId}`);
    }
    const ticketType: LemonadeTicketType = {
      _id: randomUUID(),
      title,
      prices: [
        {
          cost: "1",
          currency: "USD"
        }
      ]
    };

    const eventTicketTypes = this.ticketTypes.get(eventId) ?? new Map();
    eventTicketTypes.set(ticketType._id, ticketType);
    this.ticketTypes.set(eventId, eventTicketTypes);

    return ticketType;
  }

  public addTicket(
    eventId: string,
    type: string,
    userId: string
  ): LemonadeTicket {
    if (!this.events.has(eventId)) {
      throw new Error(`Can't add ticket to non-existent event ${eventId}`);
    }
    if (!this.ticketTypes.get(eventId)?.has(type)) {
      throw new Error(
        `Can't add ticket of non-existent type ${type} to event ${eventId}`
      );
    }
    if (!this.users.has(userId)) {
      throw new Error(`Can't add ticket for non-existent user ${userId}`);
    }
    const ticket: LemonadeTicket = {
      _id: randomUUID(),
      type,
      assigned_to_expanded: this.users.get(userId) as LemonadeUser,
      assigned_to: userId,
      assigned_email: null, // This is what we get from the live API, if you
      // want the email address then look in `assigned_to_expanded`
      accepted: null // This is how un-checked-in users seem to be represented
    };

    const eventTickets = this.tickets.get(eventId) ?? new Map();
    eventTickets.set(ticket._id, ticket);
    this.tickets.set(eventId, eventTickets);

    return ticket;
  }

  public getEvents(): Map<string, LemonadeEvent> {
    return this.events;
  }

  public getTicketTypes(): Map<string, Map<string, LemonadeTicketType>> {
    return this.ticketTypes;
  }
}

/**
 * In-memory representation of Lemonade's backend, for testing purposes.
 */
export class LemonadeDataMocker {
  // Accounts are equivalent to 'organizers' in Pretix - they are the accounts
  // that event organizers will have. Authenticated requests to Lemonade
  // provide a "client ID" that belongs to the account.
  // Map key is the client ID.
  private accounts: Map<string, LemonadeAccount>;

  // Users are registered users in the Lemonade system, e.g. ticket-holders.
  // Map key is the user ID.
  private users: Map<string, LemonadeUser>;

  public constructor() {
    this.accounts = new Map();
    this.users = new Map();
  }

  /**
   * Add a user, representing a user registered on Lemonade.
   */
  public addUser(
    email: string,
    firstName: string,
    lastName: string
  ): LemonadeUser {
    const user: LemonadeUser = {
      __typename: "User",
      _id: randomUUID(),
      email,
      first_name: firstName,
      last_name: lastName,
      name: `${firstName}${lastName}`.toLocaleLowerCase()
    };

    this.users.set(user._id, user);

    return user;
  }

  public addAccount(clientId: string): LemonadeAccount {
    if (this.accounts.has(clientId)) {
      throw new Error(`Account ${clientId} already exists`);
    }

    const account = new LemonadeAccount(this.users);
    this.accounts.set(clientId, account);

    return account;
  }

  public getAccount(clientId: string): LemonadeAccount {
    if (!this.accounts.has(clientId)) {
      throw new Error(`Could not get non-existent account ${clientId}`);
    }

    return this.accounts.get(clientId) as LemonadeAccount;
  }

  // public addTicket(eventId: string, type: string): LemonadeTicket {
  //   const ticket: LemonadeTicket = {
  //     _id: randomUUID(),
  //     type
  //   };
  // }
  // private events: LemonadeEvent[];
  // private users: LemonadeUser[];

  // public constructor() {
  //   this.events = [];
  //   this.users = [];
  // }

  // public getUsersEvents(userId: string): LemonadeEvent[] {
  //   return this.events.filter((e) => {
  //     return e.permissionedUserIds.includes(userId);
  //   });
  // }

  // public getEvent(eventId: string): LemonadeEvent | undefined {
  //   return this.events.find((e) => e.id === eventId);
  // }

  // public getTier(
  //   eventId: string,
  //   tierId: string
  // ): LemonadeTicketTier | undefined {
  //   const event = this.getEvent(eventId);

  //   if (!event) {
  //     return undefined;
  //   }

  //   return event.tiers.find((t) => t.id === tierId);
  // }

  // public addTicket(
  //   tierId: string,
  //   eventId: string,
  //   attendeeName: string,
  //   attendeeEmail: string
  // ): LemonadeTicket {
  //   const newTicket: LemonadeTicket = {
  //     checkedIn: false,
  //     eventId,
  //     id: randomUUID(),
  //     email: attendeeEmail,
  //     name: attendeeName,
  //     tierId
  //   };

  //   const event = this.getEvent(eventId);

  //   if (!event) {
  //     throw new Error(`can't add ticket to event that doesn't exist`);
  //   }

  //   const tier = this.getTier(eventId, tierId);

  //   if (!tier) {
  //     throw new Error(`can't add ticket to tier that doesn't exist`);
  //   }

  //   event.tickets.push(newTicket);

  //   return newTicket;
  // }

  // public addEvent(name: string): LemonadeEvent {
  //   const newEvent: LemonadeEvent = {
  //     id: randomUUID(),
  //     name: name,
  //     tickets: [],
  //     tiers: [],
  //     permissionedUserIds: []
  //   };
  //   this.events.push(newEvent);
  //   return newEvent;
  // }

  // public addTier(eventId: string, name: string): LemonadeTicketTier {
  //   const newTier: LemonadeTicketTier = {
  //     id: randomUUID(),
  //     name
  //   };
  //   const event = this.events.find((e) => e.id === eventId);
  //   if (!event) {
  //     throw new Error(`unable to find event with id ${eventId}`);
  //   }
  //   const existingTier = event.tiers.find((t) => t.name === name);
  //   if (existingTier) {
  //     throw new Error(
  //       `event ${eventId} already has a ticket tier with name ${name}`
  //     );
  //   }
  //   event.tiers.push(newTier);
  //   return newTier;
  // }

  // public addUser(name?: string): LemonadeUser {
  //   const newUser: LemonadeUser = {
  //     email: randomEmail(),
  //     id: randomUUID(),
  //     apiKey: randomUUID(),
  //     name: name ?? randomUUID()
  //   };
  //   this.users.push(newUser);
  //   return newUser;
  // }

  // public getUser(userId: string): LemonadeUser | undefined {
  //   return this.users.find((u) => u.id === userId);
  // }

  // public getUserByApiKey(apiKey: string): LemonadeUser | undefined {
  //   return this.users.find((u) => u.apiKey === apiKey);
  // }

  // /**
  //  * Co-hosts on Lemonade have check-in privelages.
  //  */
  // public makeCoHost(userId: string, eventId: string): void {
  //   const user = this.getUser(userId);
  //   const event = this.getEvent(eventId);

  //   if (!user) {
  //     throw new Error(`user ${userId} does not exist`);
  //   }

  //   if (!event) {
  //     throw new Error(`event ${eventId} does not exist`);
  //   }

  //   if (event.permissionedUserIds.includes(user.id)) {
  //     throw new Error(
  //       `event ${eventId} already has user ${userId} as an admin`
  //     );
  //   }

  //   event.permissionedUserIds.push(userId);
  // }
}
