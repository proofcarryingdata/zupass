import { traced } from "../services/telemetryService";
import { logger } from "../util/logger";
import { requireEnv } from "../util/util";

const TRACE_SERVICE = "Fetch";

export interface IPretixAPI {
  config: PretixConfig;
  fetchOrders(eventID: string): Promise<PretixOrder[]>;
  fetchSubevents(eventID: string): Promise<PretixSubevent[]>;
}

export class PretixAPI implements IPretixAPI {
  public config: PretixConfig;

  public constructor(config: PretixConfig) {
    this.config = config;
  }

  // Fetch all orders for a given event.
  public async fetchOrders(eventID: string): Promise<PretixOrder[]> {
    return traced(TRACE_SERVICE, "fetchOrders", async () => {
      const orders: PretixOrder[] = [];

      // Fetch orders from paginated API
      let url = `${this.config.orgUrl}/events/${eventID}/orders/`;
      while (url != null) {
        logger(`[PRETIX] Fetching ${url}`);
        const res = await fetch(url, {
          headers: { Authorization: `Token ${this.config.token}` }
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

  // Fetch all item types for a given event.
  public async fetchSubevents(eventID: string): Promise<PretixSubevent[]> {
    return traced(TRACE_SERVICE, "fetchSubevents", async () => {
      const orders: PretixSubevent[] = [];

      // Fetch orders from paginated API
      let url = `${this.config.orgUrl}/events/${eventID}/subevents/`;
      while (url != null) {
        logger(`[PRETIX] Fetching ${url}`);
        const res = await fetch(url, {
          headers: { Authorization: `Token ${this.config.token}` }
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

export function getPretixConfig(): PretixConfig | null {
  // Make sure we can use the Pretix API.
  let pretixConfig: PretixConfig;
  try {
    pretixConfig = {
      token: requireEnv("PRETIX_TOKEN"),
      orgUrl: requireEnv("PRETIX_ORG_URL"),
      zuEventID: requireEnv("PRETIX_ZU_EVENT_ID"),
      zuVisitorEventID: requireEnv("PRETIX_VISITOR_EVENT_ID"),
      // See https://beta.ticketh.xyz/control/event/zuzalu/zuzalu/items/151/
      zuEventOrganizersItemID: 151
    };
    logger(
      "[ZUZALU PRETIX] read config: " + JSON.stringify(pretixConfig, null, 2)
    );
    return pretixConfig;
  } catch (e) {
    logger(
      `[INIT] missing environment variable ${e} required by pretix configuration`
    );
    return null;
  }
}

export function getPretixAPI(): IPretixAPI | null {
  const config = getPretixConfig();

  if (config === null) {
    return null;
  }

  const api = new PretixAPI(config);
  return api;
}

// A Pretix order. For our purposes, each order contains one ticket.
export interface PretixOrder {
  code: string; // "Q0BHN"
  status: string; // "p"
  testmode: boolean;
  secret: string;
  email: string;
  positions: PretixPosition[]; // should have exactly one
}

// Unclear why this is called a "position" rather than a ticket.
export interface PretixPosition {
  id: number;
  order: string; // "Q0BHN"
  positionid: number;
  item: number;
  price: string;
  attendee_name: string; // first and last
  attendee_email: string;
  subevent: number;
}

export interface PretixSubevent {
  id: number;
  date_from?: string | null;
  date_to?: string | null;
}

export interface PretixConfig {
  token: string;
  orgUrl: string;
  zuEventID: string;
  zuVisitorEventID: string;
  zuEventOrganizersItemID: number;
}
