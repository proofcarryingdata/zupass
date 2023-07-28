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
  organizerConfigId: number,
  activeItemIds: string[],
  superuserItemIds: string[],
  eventId: string
): Promise<number> {
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

export async function updatePretixEventConfig(
  db: Pool,
  organizerConfigId: number,
  activeItemIds: string[],
  superuserItemIds: string[],
  eventId: string
): Promise<void> {
  const activeItemIdsSet = new Set(activeItemIds);
  superuserItemIds.forEach((superId) => {
    if (!activeItemIdsSet.has(superId)) {
      throw new Error(
        "super user item id must be included in the active item ids set"
      );
    }
  });

  await sqlQuery(
    db,
    `update pretix_events_config
    (pretix_organizers_config_id, active_item_ids, event_id, superuser_item_ids)
    set pretix_organizers_config_id = $1, active_item_ids = $2
    event_id = $3, superuser_item_ids = $4
    where id = $5`,
    [
      organizerConfigId,
      `{${activeItemIds.join(",")}}`,
      eventId,
      `{${superuserItemIds.join(",")}}`,
      organizerConfigId
    ]
  );
}
