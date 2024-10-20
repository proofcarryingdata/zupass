import { PoolClient } from "postgres-pool";
import { PretixOrganizersConfig } from "../../database/models";
import { fetchPretixConfiguration } from "../../database/queries/pretix_config/fetchPretixConfiguration";
import { logger } from "../../util/logger";

export async function getDevconnectPretixConfig(
  client: PoolClient
): Promise<DevconnectPretixConfig | null> {
  try {
    const pretixConfig = pretixConfigDBToDevconnectPretixConfig(
      await fetchPretixConfiguration(client)
    );
    logger(
      "[DEVCONNECT PRETIX] read config: " +
        JSON.stringify(pretixConfig, null, 2)
    );
    return pretixConfig;
  } catch (e) {
    logger(`[INIT] error while querying pretix organizer configuration: ${e}`);
    return null;
  }
}

function pretixConfigDBToDevconnectPretixConfig(
  pretixOrganizersDB: PretixOrganizersConfig[]
): DevconnectPretixConfig {
  return {
    organizers: pretixOrganizersDB.map(
      (organizerDB) =>
        ({
          id: organizerDB.id,
          orgURL: organizerDB.organizer_url,
          events: organizerDB.events.map((eventDB) => ({
            id: eventDB.id,
            eventID: eventDB.event_id,
            activeItemIDs: eventDB.active_item_ids,
            superuserItemIds: eventDB.superuser_item_ids
          })),
          disabled: organizerDB.disabled,
          token: organizerDB.token
        }) satisfies DevconnectPretixOrganizerConfig
    )
  };
}

// In-memory representation of Pretix event configuration
export interface DevconnectPretixEventConfig {
  id: string;
  eventID: string;
  activeItemIDs: string[]; // relevant item IDs that correspond to ticket products
  superuserItemIds: string[]; // subset of activeItemIDs representing products only superusers have
}

// In-memory representation of Pretix organizer configuration
export interface DevconnectPretixOrganizerConfig {
  id: string;
  orgURL: string;
  token: string;
  disabled: boolean;
  events: DevconnectPretixEventConfig[];
}

export interface DevconnectPretixConfig {
  organizers: DevconnectPretixOrganizerConfig[];
}
