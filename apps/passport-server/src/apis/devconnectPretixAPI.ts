import { Pool } from "pg";
import { PretixOrganizer } from "../database/models";
import { fetchAllPretixOrganizers } from "../database/queries/pretix_organizers/fetchPretixOrganizers";
import { traced } from "../services/telemetryService";
import { logger } from "../util/logger";

const TRACE_SERVICE = "Fetch";

export interface IDevconnectPretixAPI {
  config: DevconnectPretixConfig;
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
}

export class DevconnectPretixAPI implements IDevconnectPretixAPI {
  public config: DevconnectPretixConfig;

  public constructor(config: DevconnectPretixConfig) {
    this.config = config;
  }

  public async fetchItems(
    orgUrl: string,
    token: string,
    eventID: string
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
          logger(`Error fetching ${url}: ${res.status} ${res.statusText}`);
          break;
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

export async function getDevconnectPretixConfig(
  dbClient: Pool
): Promise<DevconnectPretixConfig | null> {
  // Make sure we can use the Pretix API.
  let pretixConfig: DevconnectPretixConfig;
  try {
    const organizers = await fetchAllPretixOrganizers(dbClient);
    pretixConfig = {
      organizers,
    };
    logger("[DEVCONNECT PRETIX] read config: " + JSON.stringify(pretixConfig));
    return pretixConfig;
  } catch (e) {
    logger(`[INIT] error while querying pretix organizer configuration: ${e}`);
    return null;
  }
}

export async function getDevconnectPretixAPI(
  dbClient: Pool
): Promise<IDevconnectPretixAPI | null> {
  const config = await getDevconnectPretixConfig(dbClient);

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

export interface DevconnectPretixItem {
  id: number; // corresponds to "item" field in DevconnectPretixPosition
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
  attendee_email: string;
  subevent: number;
}

export interface DevconnectPretixConfig {
  organizers: PretixOrganizer[];
}
