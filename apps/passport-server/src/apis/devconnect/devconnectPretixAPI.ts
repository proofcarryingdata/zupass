import { traced } from "../../services/telemetryService";
import { logger } from "../../util/logger";

const TRACE_SERVICE = "Fetch";

export interface IDevconnectPretixAPI {
  fetchOrders(
    orgUrl: string,
    token: string,
    eventID: string,
  ): Promise<DevconnectPretixOrder[]>;
  fetchItems(
    orgUrl: string,
    token: string,
    eventID: string,
  ): Promise<DevconnectPretixItem[]>;
  fetchEvent(
    orgUrl: string,
    token: string,
    eventID: string,
  ): Promise<DevconnectPretixEvent>;
}

export class DevconnectPretixAPI implements IDevconnectPretixAPI {
  public async fetchAllEvents(
    orgUrl: string,
    token: string,
  ): Promise<DevconnectPretixEvent[]> {
    return traced(TRACE_SERVICE, "fetchItems", async () => {
      const events: DevconnectPretixEvent[] = [];

      // Fetch orders from paginated API
      let url = `${orgUrl}/events`;
      while (url != null) {
        logger(`[DEVCONNECT PRETIX] Fetching ${url}`);
        const res = await fetch(url, {
          headers: { Authorization: `Token ${token}` },
        });
        if (!res.ok) {
          throw new Error(
            `[PRETIX] Error fetching ${url}: ${res.status} ${res.statusText}`,
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
  ): Promise<DevconnectPretixEvent> {
    return traced(TRACE_SERVICE, "fetchItems", async () => {
      // Fetch event API
      const url = `${orgUrl}/events/${eventID}/`;
      logger(`[DEVCONNECT PRETIX] Fetching ${url}`);
      const res = await fetch(url, {
        headers: { Authorization: `Token ${token}` },
      });
      if (!res.ok) {
        throw new Error(
          `[PRETIX] Error fetching ${url}: ${res.status} ${res.statusText}`,
        );
      }
      return res.json();
    });
  }

  public async fetchItems(
    orgUrl: string,
    token: string,
    eventID: string,
  ): Promise<DevconnectPretixItem[]> {
    return traced(TRACE_SERVICE, "fetchItems", async () => {
      const items: DevconnectPretixItem[] = [];

      // Fetch orders from paginated API
      let url = `${orgUrl}/events/${eventID}/items/`;
      while (url != null) {
        logger(`[DEVCONNECT PRETIX] Fetching ${url}`);
        const res = await fetch(url, {
          headers: { Authorization: `Token ${token}` },
        });
        if (!res.ok) {
          throw new Error(
            `[PRETIX] Error fetching ${url}: ${res.status} ${res.statusText}`,
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
  ): Promise<DevconnectPretixOrder[]> {
    return traced(TRACE_SERVICE, "fetchOrders", async () => {
      const orders: DevconnectPretixOrder[] = [];

      // Fetch orders from paginated API
      let url = `${orgUrl}/events/${eventID}/orders/`;
      while (url != null) {
        logger(`[DEVCONNECT PRETIX] Fetching ${url}`);
        const res = await fetch(url, {
          headers: { Authorization: `Token ${token}` },
        });
        if (!res.ok) {
          throw new Error(
            `[PRETIX] Error fetching ${url}: ${res.status} ${res.statusText}`,
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
  name: {
    // TODO: Investigate what languages are necessary to support
    en: string; // English name of item
  };
}

export interface DevconnectPretixEvent {
  slug: string; // corresponds to "event_id" field in our dn
  name: {
    en: string; // English name of item
  };
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
}
