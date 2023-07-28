import { Pool } from "pg";
import { PretixOrganizerRow } from "../../models";
import { sqlQuery } from "../../sqlQuery";

export async function insertPretixOrganizerConfig(
  db: Pool,
  organizerUrl: string,
  token: string
): Promise<string> {
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
  superuserItemIds: string[],
  eventId: string
): Promise<string> {
  const activeItemIdsSet = new Set(activeItemIds);
  superuserItemIds.forEach((superId) => {
    if (!activeItemIdsSet.has(superId)) {
      throw new Error(
        "super user item id must be included in the active item ids set"
      );
    }
  });

  const result = await sqlQuery(
    db,
    `insert into pretix_events_config(pretix_organizers_config_id, active_item_ids, event_id, superuser_item_ids) ` +
      `values ($1, $2, $3, $4) returning id`,
    [
      organizerConfigId,
      `{${activeItemIds.join(",")}}`,
      eventId,
      `{${superuserItemIds.join(",")}}`
    ]
  );
  return result.rows[0].id;
}
