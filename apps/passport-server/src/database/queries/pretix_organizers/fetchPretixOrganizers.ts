import { Pool } from "pg";
import { PretixOrganizer } from "../../models";
import { sqlQuery } from "../../sqlQuery";

/**
 * Fetch the list of Pretix organizers from the database.
 */
export async function fetchAllPretixOrganizers(
  client: Pool
): Promise<Array<PretixOrganizer>> {
  const result = await sqlQuery(
    client,
    `\
  select
    organizer_url,
    event_ids,
    token
  from pretix_organizers;`
  );

  return result.rows;
}
