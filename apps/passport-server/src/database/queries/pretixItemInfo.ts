import { Pool } from "pg";
import { PretixItemInfo } from "../models";
import { sqlQuery } from "../sqlQuery";

export async function fetchPretixItemsInfoByEventInfo(
  client: Pool,
  eventInfoId: number
): Promise<Array<PretixItemInfo>> {
  const result = await sqlQuery(
    client,
    `\
      select *
      from devconnect_pretix_items_info
      where devconnect_pretix_events_info_id = $1`,
    [eventInfoId]
  );

  return result.rows;
}

export async function insertPretixItemsInfo(
  client: Pool,
  item_id: string,
  event_info_id: number,
  item_name: string
): Promise<number> {
  const result = await sqlQuery(
    client,
    `\
      insert into devconnect_pretix_items_info (item_id, devconnect_pretix_events_info_id, item_name)
      values ($1, $2, $3)
      returning id`,
    [item_id, event_info_id, item_name]
  );
  return result.rows[0].id;
}

export async function updatePretixItemsInfo(
  client: Pool,
  id: number,
  item_name: string
): Promise<Array<PretixItemInfo>> {
  const result = await sqlQuery(
    client,
    `\
      update devconnect_pretix_items_info
      set item_name = $1
      where id=$2`,
    [item_name, id]
  );
  return result.rows;
}

export async function deletePretixItemInfo(
  client: Pool,
  id: number
): Promise<void> {
  await sqlQuery(
    client,
    `delete from devconnect_pretix_items_info where id=$1`,
    [id]
  );
}
