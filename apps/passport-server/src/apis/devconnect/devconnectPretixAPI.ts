import PQueue from "p-queue";
import { traced } from "../../services/telemetryService";
import { logger } from "../../util/logger";
import { sleep } from "../../util/util";

const TRACE_SERVICE = "Fetch";

export type FetchFn = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>;

export interface IDevconnectPretixAPI {
  fetchOrders(
    orgUrl: string,
    token: string,
    eventID: string
  ): Promise<DevconnectPretixOrder[]>;
  fetchItems(
    orgUrl: string,
    token: string,
    eventID: string
  ): Promise<DevconnectPretixItem[]>;
  fetchEvent(
    orgUrl: string,
    token: string,
    eventID: string
  ): Promise<DevconnectPretixEvent>;
  fetchEventCheckinLists(
    orgUrl: string,
    token: string,
    eventID: string
  ): Promise<DevconnectPretixCheckinList[]>;
  fetchEventSettings(
    orgUrl: string,
    token: string,
    eventID: string
  ): Promise<DevconnectPretixEventSettings>;
  fetchAllEvents(
    orgUrl: string,
    token: string
  ): Promise<DevconnectPretixEvent[]>;
  pushCheckin(
    orgUrl: string,
    token: string,
    secret: string,
    checkinListId: string,
    timestamp: string
  ): Promise<void>;
  cancelPendingRequests(): void;
}

export interface DevconnectPretixAPIOptions {
  requestsPerInterval?: number;
  concurrency?: number;
  intervalMs?: number;
}

export class DevconnectPretixAPI implements IDevconnectPretixAPI {
  private requestQueue: PQueue;
  private abortController: AbortController;

  public constructor(options?: DevconnectPretixAPIOptions) {
    this.requestQueue = new PQueue({
      concurrency: options?.concurrency ?? 1,
      interval: options?.intervalMs ?? 60_000,
      intervalCap: options?.requestsPerInterval ?? 100
    });
    this.abortController = new AbortController();
  }

  private queuedFetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    // We reset abort controller signals after use, so make sure that we
    // stay bound to the current abort controller when the queued function
    // executes.
    const signal = this.abortController.signal;
    return this.requestQueue.add(async () => {
      // Create a function for doing the fetch, so we can retry it
      const doFetch = async (): Promise<Response> => {
        return fetch(input, {
          signal,
          ...init
        });
      };

      let result = await doFetch();

      // If Pretix wants us to slow down
      // @see https://docs.pretix.eu/en/latest/api/ratelimit.html
      let attempts = 0;
      while (result.status === 429 && attempts < 5) {
        attempts++;
        logger(
          `[DEVCONNECT PRETIX] Received status 429 while fetching after ${attempts} attempt(s): ${input}`
        );
        // Get how long to wait for
        const retryAfter = result.headers.get("Retry-After");
        if (retryAfter) {
          const seconds = parseFloat(retryAfter);
          // Wait for the specified time
          await sleep(seconds * 1000);
          // Try again
          result = await doFetch();
        } else {
          break;
        }
      }

      return result;
    });
  }

  public cancelPendingRequests(): void {
    this.abortController.abort();
    this.abortController = new AbortController();
  }

  public async fetchAllEvents(
    orgUrl: string,
    token: string
  ): Promise<DevconnectPretixEvent[]> {
    return traced(TRACE_SERVICE, "fetchAllEvents", async (span) => {
      span?.setAttribute("org_url", orgUrl);
      const events: DevconnectPretixEvent[] = [];

      // Fetch orders from paginated API
      let url = `${orgUrl}/events`;
      while (url != null) {
        logger(`[DEVCONNECT PRETIX] Fetching events: ${url}`);
        const res = await this.queuedFetch(url, {
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
    eventID: string
  ): Promise<DevconnectPretixEvent> {
    return traced(TRACE_SERVICE, "fetchEvent", async (span) => {
      span?.setAttribute("org_url", orgUrl);
      // Fetch event API
      const url = `${orgUrl}/events/${eventID}/`;
      logger(`[DEVCONNECT PRETIX] Fetching event: ${url}`);
      const res = await this.queuedFetch(url, {
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
    eventID: string
  ): Promise<DevconnectPretixEventSettings> {
    return traced(TRACE_SERVICE, "fetchEventSettings", async (span) => {
      span?.setAttribute("org_url", orgUrl);
      // Fetch event settings API
      const url = `${orgUrl}/events/${eventID}/settings`;
      logger(`[DEVCONNECT PRETIX] Fetching event settings: ${url}`);
      const res = await this.queuedFetch(url, {
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
    eventID: string
  ): Promise<DevconnectPretixItem[]> {
    return traced(TRACE_SERVICE, "fetchItems", async (span) => {
      span?.setAttribute("org_url", orgUrl);
      const items: DevconnectPretixItem[] = [];

      // Fetch orders from paginated API
      let url = `${orgUrl}/events/${eventID}/items/`;
      while (url != null) {
        logger(`[DEVCONNECT PRETIX] Fetching items: ${url}`);
        const res = await this.queuedFetch(url, {
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
    eventID: string
  ): Promise<DevconnectPretixOrder[]> {
    return traced(TRACE_SERVICE, "fetchOrders", async (span) => {
      span?.setAttribute("org_url", orgUrl);
      const orders: DevconnectPretixOrder[] = [];

      // Fetch orders from paginated API
      let url = `${orgUrl}/events/${eventID}/orders/`;
      while (url != null) {
        logger(`[DEVCONNECT PRETIX] Fetching orders ${url}`);
        const res = await this.queuedFetch(url, {
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

  // Fetch all orders for a given event.
  public async fetchEventCheckinLists(
    orgUrl: string,
    token: string,
    eventID: string
  ): Promise<DevconnectPretixCheckinList[]> {
    return traced(TRACE_SERVICE, "fetchOrders", async (span) => {
      span?.setAttribute("org_url", orgUrl);
      const lists: DevconnectPretixCheckinList[] = [];

      // Fetch orders from paginated API
      let url = `${orgUrl}/events/${eventID}/checkinlists/`;
      while (url != null) {
        logger(`[DEVCONNECT PRETIX] Fetching orders ${url}`);
        const res = await this.queuedFetch(url, {
          headers: { Authorization: `Token ${token}` }
        });
        if (!res.ok) {
          throw new Error(
            `[PRETIX] Error fetching ${url}: ${res.status} ${res.statusText}`
          );
        }
        const page = await res.json();
        lists.push(...page.results);
        url = page.next;
      }

      return lists;
    });
  }

  // Push a check-in to Pretix
  public async pushCheckin(
    orgUrl: string,
    token: string,
    secret: string,
    checkinListId: string,
    timestamp: string
  ): Promise<void> {
    return traced(TRACE_SERVICE, "pushCheckin", async (span) => {
      span?.setAttribute("org_url", orgUrl);

      const url = `${orgUrl}/checkinrpc/redeem/`;

      const res = await this.queuedFetch(url, {
        method: "POST",
        headers: {
          Authorization: `Token ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          secret,
          lists: [checkinListId],
          datetime: timestamp
        })
      });

      if (!res.ok) {
        throw new Error(
          `[PRETIX] Error pushing ${url}: ${res.status} ${res.statusText}`
        );
      }

      return res.json();
    });
  }
}

export async function getDevconnectPretixAPI(): Promise<DevconnectPretixAPI> {
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

export interface DevconnectPretixCheckinList {
  id: number;
  name: string;
}

export interface DevconnectPretixCheckin {
  datetime: Date;
  type: string;
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
  checkins: DevconnectPretixCheckin[];
}
