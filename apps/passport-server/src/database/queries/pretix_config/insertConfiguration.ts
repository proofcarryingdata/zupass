import { PoolClient } from "postgres-pool";
import { PretixOrganizerRow } from "../../models";
import { sqlQuery } from "../../sqlQuery";

export async function insertPretixOrganizerConfig(
  client: PoolClient,
  organizerUrl: string,
  token: string,
  disabled: boolean
): Promise<string> {
  const id = await sqlQuery(
    client,
    `insert into pretix_organizers_config(organizer_url, token, disabled) ` +
      `values ($1, $2, $3) ` +
      `on conflict (organizer_url) do update set token = $2 ` +
      `returning id`,
    [organizerUrl, token, disabled]
  );

  return id.rows[0].id;
}

export async function getAllOrganizers(
  client: PoolClient
): Promise<PretixOrganizerRow[]> {
  const result = await sqlQuery(
    client,
    `select * from pretix_organizers_config`
  );
  return result.rows as PretixOrganizerRow[];
}

export async function insertPretixEventConfig(
  client: PoolClient,
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
    client,
    `insert into pretix_events_config(pretix_organizers_config_id, active_item_ids, event_id, superuser_item_ids) ` +
      `values ($1, $2, $3, $4) ` +
      `on conflict (event_id, pretix_organizers_config_id) do update set pretix_organizers_config_id = $1, active_item_ids = $2, superuser_item_ids = $4 ` +
      `returning id`,
    [
      organizerConfigId,
      `{${activeItemIds.join(",")}}`,
      eventId,
      `{${superuserItemIds.join(",")}}`
    ]
  );
  return result.rows[0].id;
}
