import { PoolClient } from "postgres-pool";
import { PretixOrganizersConfig } from "../../models";
import { sqlQuery } from "../../sqlQuery";

/**
 * Fetch the list of Pretix organizers from the database.
 */
export async function fetchPretixConfiguration(
  client: PoolClient
): Promise<Array<PretixOrganizersConfig>> {
  const result = await sqlQuery(
    client,
    `\
    select o.id, o.organizer_url, o.token, o.disabled, json_agg(e.*) as events
    from pretix_events_config e
    join pretix_organizers_config o on e.pretix_organizers_config_id = o.id
    group by o.id, o.organizer_url, o.token, o.disabled`
  );

  return result.rows;
}

/**
 * Fetch the list of Pretix organizers from the database.
 */
export async function fetchEventConfiguration(
  client: PoolClient,
  orgURL: string,
  eventID: string
): Promise<Array<PretixOrganizersConfig>> {
  const result = await sqlQuery(
    client,
    `\
    select e.id as "configEventID", e.active_item_ids as "activeItemIDs", o.token
    from pretix_events_config e
    join pretix_organizers_config o on e.pretix_organizers_config_id = o.id
    where o.organizer_url = $1
    and e.event_id = $2`,
    [orgURL, eventID]
  );

  return result.rows;
}
