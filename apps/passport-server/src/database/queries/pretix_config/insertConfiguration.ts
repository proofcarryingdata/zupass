import { Pool } from "pg";
import { PretixOrganizerRow } from "../../models";
import { sqlQuery } from "../../sqlQuery";

export async function insertPretixOrganizerConfig(
  db: Pool,
  organizerUrl: string,
  token: string
): Promise<number> {
  const id = await sqlQuery(
    db,
    `insert into pretix_organizers_config(organizer_url, token) ` +
      `values ($1, $2) ` +
      `returning id`,
    [organizerUrl, token]
  );

  return id.rows[0].id;
}

export async function getAllOrganizers(
  db: Pool
): Promise<PretixOrganizerRow[]> {
  const result = await sqlQuery(db, `select * from pretix_organizers_config`);
  return result.rows as PretixOrganizerRow[];
}

export async function insertPretixEventConfig(
  db: Pool,
  organizerConfigId: string,
  activeItemIds: string[],
  eventId: string
): Promise<void> {
  await sqlQuery(
    db,
    `insert into pretix_events_config(pretix_organizers_config_id, active_item_ids, event_id) ` +
      `values ($1, $2, $3)`,
    [organizerConfigId, `{${activeItemIds.join(",")}}`, eventId]
  );
}
