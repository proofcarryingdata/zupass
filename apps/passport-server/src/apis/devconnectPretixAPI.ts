import { Pool } from "pg";
import { PretixOrganizersConfig } from "../database/models";
import { fetchPretixConfiguration as fetchPretixOrganizers } from "../database/queries/pretix_config/fetchPretixConfiguration";
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
  fetchEvent(
    orgUrl: string,
    token: string,
    eventID: string
  ): Promise<DevconnectPretixEvent>;
}

export class DevconnectPretixAPI implements IDevconnectPretixAPI {
  public config: DevconnectPretixConfig;

  public constructor(config: DevconnectPretixConfig) {
    this.config = config;
  }

  public async fetchEvent(
    orgUrl: string,
    token: string,
    eventID: string
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

function pretixConfigDBToDevconnectPretixConfig(
  pretixOrganizersDB: PretixOrganizersConfig[]
): DevconnectPretixConfig {
  return {
    organizers: pretixOrganizersDB.map((organizerDB) => ({
      id: organizerDB.id,
      orgURL: organizerDB.organizer_url,
      events: organizerDB.events.map((eventDB) => ({
        id: eventDB.id,
        eventID: eventDB.event_id,
        activeItemIDs: eventDB.active_item_ids,
      })),
      token: organizerDB.token,
    })),
  };
}

export async function getDevconnectPretixConfig(
  dbClient: Pool
): Promise<DevconnectPretixConfig | null> {
  try {
    const pretixConfig = pretixConfigDBToDevconnectPretixConfig(
      await fetchPretixOrganizers(dbClient)
    );
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

// In-memory representation of Pretix event configuration
export interface DevconnectPretixEventConfig {
  id: number;
  eventID: string;
  activeItemIDs: string[]; // relevant item IDs that correspond to ticket products
}

// In-memory representation of Pretix organizer configuration
export interface DevconnectPretixOrganizerConfig {
  id: number;
  orgURL: string;
  token: string;
  events: DevconnectPretixEventConfig[];
}

export interface DevconnectPretixConfig {
  organizers: DevconnectPretixOrganizerConfig[];
}
