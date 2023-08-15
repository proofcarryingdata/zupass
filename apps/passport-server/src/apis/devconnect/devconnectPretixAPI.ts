import { traced } from "../../services/telemetryService";
import { logger } from "../../util/logger";

const TRACE_SERVICE = "Fetch";

type FetchFn = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>;

export interface IDevconnectPretixAPI {
  fetchOrders(
    orgUrl: string,
    token: string,
    eventID: string,
    fetch: FetchFn
  ): Promise<DevconnectPretixOrder[]>;
  fetchItems(
    orgUrl: string,
    token: string,
    eventID: string,
    fetch: FetchFn
  ): Promise<DevconnectPretixItem[]>;
  fetchEvent(
    orgUrl: string,
    token: string,
    eventID: string,
    fetch: FetchFn
  ): Promise<DevconnectPretixEvent>;
  fetchEventSettings(
    orgUrl: string,
    token: string,
    eventID: string,
    fetch: FetchFn
  ): Promise<DevconnectPretixEventSettings>;
  fetchAllEvents(
    orgUrl: string,
    token: string,
    fetch: FetchFn
  ): Promise<DevconnectPretixEvent[]>;
}

export class DevconnectPretixAPI implements IDevconnectPretixAPI {
  public async fetchAllEvents(
    orgUrl: string,
    token: string,
    fetch: FetchFn
  ): Promise<DevconnectPretixEvent[]> {
    return traced(TRACE_SERVICE, "fetchItems", async () => {
      const events: DevconnectPretixEvent[] = [];

      // Fetch orders from paginated API
      let url = `${orgUrl}/events`;
      while (url != null) {
        logger(`[DEVCONNECT PRETIX] Fetching events: ${url}`);
        const res = await fetch(url, {
          headers: { Authorization: `Token ${token}` }
        });
        if (!res.ok) {
          throw new Error(
            `[PRETIX] Error fetching ${url}: ${res.status} ${res.statusText}`
          );
        }
        const page = await res.json();
        events.push(...page.results);
        url = page.next;
      }

      return events;
    });
  }

  public async fetchEvent(
    orgUrl: string,
    token: string,
    eventID: string,
    fetch: FetchFn
  ): Promise<DevconnectPretixEvent> {
    return traced(TRACE_SERVICE, "fetchEvent", async () => {
      // Fetch event API
      const url = `${orgUrl}/events/${eventID}/`;
      logger(`[DEVCONNECT PRETIX] Fetching event: ${url}`);
      const res = await fetch(url, {
        headers: { Authorization: `Token ${token}` }
      });
      if (!res.ok) {
        throw new Error(
          `[PRETIX] Error fetching ${url}: ${res.status} ${res.statusText}`
        );
      }
      return res.json();
    });
  }

  public async fetchEventSettings(
    orgUrl: string,
    token: string,
    eventID: string,
    fetch: FetchFn
  ): Promise<DevconnectPretixEventSettings> {
    return traced(TRACE_SERVICE, "fetchEventSettings", async () => {
      // Fetch event settings API
      const url = `${orgUrl}/events/${eventID}/settings`;
      logger(`[DEVCONNECT PRETIX] Fetching event settings: ${url}`);
      const res = await fetch(url, {
        headers: { Authorization: `Token ${token}` }
      });
      if (!res.ok) {
        throw new Error(
          `[PRETIX] Error fetching ${url}: ${res.status} ${res.statusText}`
        );
      }
      return res.json();
    });
  }

  public async fetchItems(
    orgUrl: string,
    token: string,
    eventID: string,
    fetch: FetchFn
  ): Promise<DevconnectPretixItem[]> {
    return traced(TRACE_SERVICE, "fetchItems", async () => {
      const items: DevconnectPretixItem[] = [];

      // Fetch orders from paginated API
      let url = `${orgUrl}/events/${eventID}/items/`;
      while (url != null) {
        logger(`[DEVCONNECT PRETIX] Fetching items: ${url}`);
        const res = await fetch(url, {
          headers: { Authorization: `Token ${token}` }
        });
        if (!res.ok) {
          throw new Error(
            `[PRETIX] Error fetching ${url}: ${res.status} ${res.statusText}`
          );
        }
        const page = await res.json();
        items.push(...page.results);
        url = page.next;
      }

      return items;
    });
  }

  // Fetch all orders for a given event.
  public async fetchOrders(
    orgUrl: string,
    token: string,
    eventID: string,
    fetch: FetchFn
  ): Promise<DevconnectPretixOrder[]> {
    return traced(TRACE_SERVICE, "fetchOrders", async () => {
      const orders: DevconnectPretixOrder[] = [];

      // Fetch orders from paginated API
      let url = `${orgUrl}/events/${eventID}/orders/`;
      while (url != null) {
        logger(`[DEVCONNECT PRETIX] Fetching orders ${url}`);
        const res = await fetch(url, {
          headers: { Authorization: `Token ${token}` }
        });
        if (!res.ok) {
          throw new Error(
            `[PRETIX] Error fetching ${url}: ${res.status} ${res.statusText}`
          );
        }
        const page = await res.json();
        orders.push(...page.results);
        url = page.next;
      }

      return orders;
    });
  }
}

export async function getDevconnectPretixAPI(): Promise<IDevconnectPretixAPI | null> {
  const api = new DevconnectPretixAPI();
  return api;
}

export type DevconnectPretixI18nMap = { [lang: string]: string };

/**
 * Return an English-language string if one exists, otherwise the first
 */
export function getI18nString(map: DevconnectPretixI18nMap): string {
  return map["en"] ?? Object.values(map)[0];
}

// A Pretix order. For our purposes, each order contains one ticket.
export interface DevconnectPretixOrder {
  code: string; // "Q0BHN"
  status: string; // "p"
  testmode: boolean;
  secret: string;
  email: string;
  positions: DevconnectPretixPosition[]; // should have exactly one
}

export interface DevconnectPretixItem {
  id: number; // corresponds to "item" field in DevconnectPretixPosition
  admission: boolean;
  personalized: boolean;
  generate_tickets?: boolean | null;
  name: DevconnectPretixI18nMap;
}

export interface DevconnectPretixEvent {
  slug: string; // corresponds to "event_id" field in our dn
  name: DevconnectPretixI18nMap;
}

export interface DevconnectPretixEventSettings {
  // These settings control whether individual attendees must have
  // email addresses specified.
  // Corresponds to the "Ask for email addresses per ticket" setting
  // in the "Customer and attendee data" section of event settings
  // in the Pretix UI.
  attendee_emails_asked: boolean;
  attendee_emails_required: boolean;
}

// Unclear why this is called a "position" rather than a ticket.
export interface DevconnectPretixPosition {
  id: number;
  order: string; // "Q0BHN"
  positionid: number;
  item: number;
  price: string;
  attendee_name: string; // first and last
  attendee_email: string | null;
  subevent: number;
  secret: string;
}
