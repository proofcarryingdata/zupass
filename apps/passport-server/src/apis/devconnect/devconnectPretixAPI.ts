import { setMaxListeners } from "events";
import PQueue from "p-queue";
import { instrumentedFetch } from "../../apis/fetch";
import { traced } from "../../services/telemetryService";
import { logger } from "../../util/logger";

const TRACE_SERVICE = "DevconnectPretixAPI";

export type FetchFn = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>;
//
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
  fetchCategories(
    orgUrl: string,
    token: string,
    eventID: string
  ): Promise<DevconnectPretixCategory[]>;
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
  private cancelController: AbortController;
  private readonly maxConcurrentRequests: number;
  private readonly intervalCap: number;
  private readonly interval: number;

  public constructor(options?: DevconnectPretixAPIOptions) {
    this.intervalCap = options?.requestsPerInterval ?? 100;
    this.maxConcurrentRequests = options?.concurrency ?? 1;
    this.interval = options?.intervalMs ?? 60_000;

    this.requestQueue = new PQueue({
      concurrency: this.maxConcurrentRequests,
      interval: this.interval,
      intervalCap: this.intervalCap
    });
    this.cancelController = this.newCancelController();
  }

  private queuedFetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    // Set up an abort controller for this request.
    const abortController = new AbortController();
    const abortHandler = (): void => {
      abortController.abort();
    };

    // Trigger the abort signal if our main "cancel" controller fires.
    this.cancelController.signal.addEventListener("abort", abortHandler);

    return this.requestQueue.add(async () => {
      try {
        const result = await instrumentedFetch(input, {
          signal: abortController.signal,
          ...init
        });

        if (result.status === 429) {
          logger(
            `[DEVCONNECT PRETIX] Received 429 error while fetching ${input.toString()}.
            API client is currently enforcing a limit of ${
              this.intervalCap
            } requests per ${this.interval} milliseconds.`
          );
        }

        return result;
      } finally {
        this.cancelController.signal.removeEventListener("abort", abortHandler);
      }
    });
  }

  private newCancelController(): AbortController {
    const ac = new AbortController();
    // Since we never have more than maxConcurrentRequests at the same time,
    // there should never be more than that number of event listeners.
    setMaxListeners(this.maxConcurrentRequests, ac.signal);
    return ac;
  }

  public cancelPendingRequests(): void {
    this.cancelController.abort();
    this.cancelController = this.newCancelController();
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

  public async fetchCategories(
    orgUrl: string,
    token: string,
    eventID: string
  ): Promise<DevconnectPretixCategory[]> {
    return traced(TRACE_SERVICE, "fetchAddons", async (span) => {
      span?.setAttribute("org_url", orgUrl);
      const categories: DevconnectPretixCategory[] = [];

      // Fetch categories from paginated API
      let url = `${orgUrl}/events/${eventID}/categories/`;
      while (url != null) {
        logger(`[DEVCONNECT PRETIX] Fetching categories: ${url}`);
        const res = await this.queuedFetch(url, {
          headers: { Authorization: `Token ${token}` }
        });
        if (!res.ok) {
          throw new Error(
            `[PRETIX] Error fetching ${url}: ${res.status} ${res.statusText}`
          );
        }
        const page = await res.json();
        categories.push(...page.results);
        url = page.next;
      }

      return categories;
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

  // Fetch all check-in lists for a given event.
  public async fetchEventCheckinLists(
    orgUrl: string,
    token: string,
    eventID: string
  ): Promise<DevconnectPretixCheckinList[]> {
    return traced(TRACE_SERVICE, "fetchOrders", async (span) => {
      span?.setAttribute("org_url", orgUrl);
      const lists: DevconnectPretixCheckinList[] = [];

      // Fetch check-in lists from paginated API
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
  name: string;
  email: string;
  positions: DevconnectPretixPosition[]; // should have exactly one
}

export interface DevconnectPretixItem {
  id: number; // corresponds to "item" field in DevconnectPretixPosition
  category: number;
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

export interface DevconnectPretixCategory {
  id: number;
  is_addon: boolean;
}

// Each event has one or more check-in lists
// We only care about these because we need the list ID for check-in sync
export interface DevconnectPretixCheckinList {
  id: number;
  name: string;
}

// This records when an attendee was checked in
export interface DevconnectPretixCheckin {
  datetime: string;
  type: "entry" | "exit";
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
