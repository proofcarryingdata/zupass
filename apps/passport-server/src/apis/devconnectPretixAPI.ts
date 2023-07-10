import { traced } from "../services/telemetryService";
import { logger } from "../util/logger";

const TRACE_SERVICE = "Fetch";

export interface IDevconnectPretixAPI {
  config: DevconnectPretixConfig | DevconnectPretixConfig;
  fetchOrders(
    orgUrl: string,
    token: string,
    eventID: string
  ): Promise<DevconnectPretixOrder[]>;
}

export class DevconnectPretixAPI implements IDevconnectPretixAPI {
  public config: DevconnectPretixConfig;

  public constructor(config: DevconnectPretixConfig) {
    this.config = config;
  }

  // Fetch all orders for a given event.
  public async fetchOrders(
    orgUrl: string,
    token: string,
    eventID: string
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
          logger(`Error fetching ${url}: ${res.status} ${res.statusText}`);
          break;
        }
        const page = await res.json();
        orders.push(...page.results);
        url = page.next;
      }

      return orders;
    });
  }
}

export function getDevconnectPretixConfig(): DevconnectPretixConfig | null {
  // Make sure we can use the Pretix API.
  let pretixConfig: DevconnectPretixConfig;
  try {
    pretixConfig = {
      // TODO: update
      organizers: [],
    };
    logger("[DEVCONNECT PRETIX] read config: " + JSON.stringify(pretixConfig));
    return pretixConfig;
  } catch (e) {
    logger(
      `[INIT] missing environment variable ${e} required by pretix configuration`
    );
    return null;
  }
}

export function getDevconnectPretixAPI(): IDevconnectPretixAPI | null {
  const config = getDevconnectPretixConfig();

  if (config === null) {
    return null;
  }

  const api = new DevconnectPretixAPI(config);
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

// Unclear why this is called a "position" rather than a ticket.
export interface DevconnectPretixPosition {
  id: number;
  order: string; // "Q0BHN"
  positionid: number;
  item: number;
  price: string;
  attendee_name: string; // first and last
  attendee_email: string;
  subevent: number;
}

interface DevconnectPretixOrganizer {
  orgUrl: string;
  eventIDs: string[];
  token: string;
}

export interface DevconnectPretixConfig {
  organizers: DevconnectPretixOrganizer[];
}
