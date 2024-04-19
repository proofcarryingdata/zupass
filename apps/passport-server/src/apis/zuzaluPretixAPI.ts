import { traced } from "../services/telemetryService";
import { logger } from "../util/logger";
import { requireEnv } from "../util/util";
import { instrumentedFetch } from "./fetch";

const TRACE_SERVICE = "PretixAPI";

export interface IZuzaluPretixAPI {
  config: ZuzaluPretixConfig;
  fetchOrders(eventID: string): Promise<ZuzaluPretixOrder[]>;
  fetchSubevents(eventID: string): Promise<ZuzaluPretixSubevent[]>;
}

export class ZuzaluPretixAPI implements IZuzaluPretixAPI {
  public config: ZuzaluPretixConfig;

  public constructor(config: ZuzaluPretixConfig) {
    this.config = config;
  }

  // Fetch all orders for a given event.
  public async fetchOrders(eventID: string): Promise<ZuzaluPretixOrder[]> {
    return traced(TRACE_SERVICE, "fetchOrders", async () => {
      const orders: ZuzaluPretixOrder[] = [];

      // Fetch orders from paginated API
      let url = `${this.config.orgUrl}/events/${eventID}/orders/`;
      while (url) {
        logger(`[PRETIX] Fetching ${url}`);
        const res = await instrumentedFetch(url, {
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
  public async fetchSubevents(
    eventID: string
  ): Promise<ZuzaluPretixSubevent[]> {
    return traced(TRACE_SERVICE, "fetchSubevents", async () => {
      const orders: ZuzaluPretixSubevent[] = [];

      // Fetch orders from paginated API
      let url = `${this.config.orgUrl}/events/${eventID}/subevents/`;
      while (url) {
        logger(`[PRETIX] Fetching ${url}`);
        const res = await instrumentedFetch(url, {
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

export function getZuzaluPretixConfig(): ZuzaluPretixConfig | null {
  // Make sure we can use the Pretix API.
  let pretixConfig: ZuzaluPretixConfig;
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
      "[ZUZALU PRETIX] read config: ",
      JSON.stringify(pretixConfig, null, 2)
    );
    return pretixConfig;
  } catch (e) {
    logger(
      `[INIT] missing environment variable ${e} required by pretix configuration`
    );
    return null;
  }
}

export function getZuzaluPretixAPI(): IZuzaluPretixAPI | null {
  const config = getZuzaluPretixConfig();

  if (config === null) {
    return null;
  }

  const api = new ZuzaluPretixAPI(config);
  return api;
}

// A Pretix order. For our purposes, each order contains one ticket.
export interface ZuzaluPretixOrder {
  code: string; // "Q0BHN"
  status: string; // "p"
  testmode: boolean;
  secret: string;
  email: string;
  positions: ZuzaluPretixPosition[]; // should have exactly one
}

// Unclear why this is called a "position" rather than a ticket.
export interface ZuzaluPretixPosition {
  id: number;
  order: string; // "Q0BHN"
  positionid: number;
  item: number;
  price: string;
  attendee_name: string; // first and last
  attendee_email: string;
  subevent: number;
  secret: string;
}

export interface ZuzaluPretixSubevent {
  id: number;
  date_from?: string | null;
  date_to?: string | null;
}

export interface ZuzaluPretixConfig {
  token: string;
  orgUrl: string;
  zuEventID: string;
  zuVisitorEventID: string;
  zuEventOrganizersItemID: number;
}
