import { Pool } from "pg";
import { PretixOrganizersConfig } from "../../models";
import { sqlQuery } from "../../sqlQuery";

/**
 * Fetch the list of Pretix organizers from the database.
 */
export async function fetchAllPretixOrganizersConfig(
  client: Pool
): Promise<Array<PretixOrganizersConfig>> {
  const result = await sqlQuery(
    client,
    `\
    select o.organizer_url, o.token, json_agg(e.*) as events
    from pretix_organizers_config o
    join pretix_events_config e on o.organizer_url = e.organizer_url
    group by o.organizer_url`
  );

  return result.rows;
}
