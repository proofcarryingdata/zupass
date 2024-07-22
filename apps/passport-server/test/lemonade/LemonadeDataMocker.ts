import { randomUUID } from "crypto";
import {
  LemonadeEvent,
  LemonadeTicket,
  LemonadeTicketType
} from "../../src/apis/lemonade/types";

/**
 * For testing purposes, this models Lemonade users. This is Lemonade's model
 * of a registered user, such as a person attending an event. We need to be
 * able to add users in order to model the underlying domain behind tickets.
 *
 * Users and Accounts are related in Lemonade, but for our purposes we will
 * ignore this connection: an Account represents the Lemonade account of the
 * user whose credentials are being used by the pipeline to access the
 * back-end, and a User is a user who is attending an event.
 */
export interface LemonadeUser {
  __typename: "User";
  _id: string;
  name: string;
  first_name: string;
  last_name: string;
  email: string;
}

/**
 * Manages test data for a single Lemonade account, roughly similar to an
 * organizer in Pretix. In the real API, the set of events, tickets etc.
 * available to the user is determined by their OAuth credentials. An
 * "account" here models the different sets of results that are available when
 * authenticating with different credentials.
 */
export class LemonadeAccount {
  private events: Map<string, LemonadeEvent>;
  private ticketTypes: Map<string, Map<string, LemonadeTicketType>>;
  private tickets: Map<string, Map<string, LemonadeTicket>>;
  // Reference to a shared map of users
  private users: Map<string, LemonadeUser>;

  public constructor(users: Map<string, LemonadeUser>) {
    this.events = new Map();
    this.ticketTypes = new Map();
    this.tickets = new Map();
    // Store reference to user map shared between all accounts
    this.users = users;
  }

  /**
   * Add an event.
   */
  public addEvent(title: string): LemonadeEvent {
    const event: LemonadeEvent = {
      title,
      _id: randomUUID()
    };

    this.events.set(event._id, event);
    return event;
  }

  /**
   * Add a ticket type. The eventId must match an existing event.
   * See {@link addEvent}
   */
  public addTicketType(eventId: string, title: string): LemonadeTicketType {
    if (!this.events.has(eventId)) {
      throw new Error(`Can't add ticket type to non-existent event ${eventId}`);
    }
    const ticketType: LemonadeTicketType = {
      _id: randomUUID(),
      title
    };

    const eventTicketTypes = this.ticketTypes.get(eventId) ?? new Map();
    eventTicketTypes.set(ticketType._id, ticketType);
    this.ticketTypes.set(eventId, eventTicketTypes);

    return ticketType;
  }

  /**
   * Add a ticket. The eventId and ticketTypeId must match existing events and
   * ticket types, and the user ID must have been added via LemonadeDataMocker.
   * See {@link addEvent} and {@link addTicketType}
   */
  public addUserTicket(
    eventId: string,
    ticketTypeId: string,
    userId: string,
    userName: string
  ): LemonadeTicket {
    if (!this.events.has(eventId)) {
      throw new Error(`Can't add ticket to non-existent event ${eventId}`);
    }
    if (!this.ticketTypes.get(eventId)?.has(ticketTypeId)) {
      throw new Error(
        `Can't add ticket of non-existent type ${ticketTypeId} to event ${eventId}`
      );
    }
    if (!this.users.has(userId)) {
      throw new Error(`Can't add ticket for non-existent user ${userId}`);
    }
    const user = this.users.get(userId) as LemonadeUser;
    const ticket: LemonadeTicket = {
      email: user.email,
      _id: randomUUID(),
      type_id: ticketTypeId,
      type_title: this.ticketTypes.get(eventId)?.get(ticketTypeId)
        ?.title as string,
      assigned_email: "",
      user_id: userId,
      user_email: user.email,
      user_name: userName,
      user_first_name: user.first_name,
      user_last_name: user.last_name,
      checkin_date: null
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

  public getTickets(): Map<string, Map<string, LemonadeTicket>> {
    return this.tickets;
  }

  /**
   * Check in a user.
   */
  public setCheckin(
    eventId: string,
    userId: string,
    checkinDate: Date | null,
    force = false
  ): void {
    if (!this.events.has(eventId)) {
      throw new Error(`Can't check in user to non-existent event ${eventId}`);
    }
    if (!this.users.has(userId)) {
      throw new Error(`Can't check in non-existent user ${userId}`);
    }

    const tickets = this.getTickets().get(eventId)?.values();
    let ticket;

    if (
      !tickets ||
      !(ticket = [...tickets].find(
        (t) => t.user_email === this.users.get(userId)?.email
      ))
    ) {
      throw new Error(
        `Can't find ticket assigned to user ${userId} for ${eventId}`
      );
    }

    // If the ticket exists and has already been checked in
    if (ticket.checkin_date && checkinDate && !force) {
      throw new Error(`User ${userId} is already checked in to ${eventId}`);
    }

    if (!ticket.checkin_date && !checkinDate && !force) {
      throw new Error(`User ${userId} is already checked out from ${eventId}`);
    }

    // If checkinDate is a date, checks the user in. If null, checks the user
    // out.
    ticket.checkin_date = checkinDate;
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

  /**
   * Simulates the effect of checking a user out. This is not currently
   * possible in the Lemonade UI, but can be done via the API, so we have to
   * account for the possibility that a previously checked-in user could become
   * checked out.
   */
  public checkOutUser(clientId: string, eventId: string, userId: string): void {
    const account = this.getAccount(clientId);
    // Un-checked-in users are represented by a checkin date of `null`
    account.setCheckin(eventId, userId, null);
  }

  /**
   * Checks all tickets out, useful for resetting check-in status.
   */
  public checkOutAll(): void {
    for (const account of this.accounts.values()) {
      for (const [eventId, eventTickets] of account.getTickets().entries()) {
        for (const ticket of eventTickets.values()) {
          account.setCheckin(eventId, ticket.user_id as string, null, true);
        }
      }
    }
  }
}
