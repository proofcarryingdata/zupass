import { PoolClient } from "postgres-pool";
import { PretixItemInfo } from "../models";
import { sqlQuery } from "../sqlQuery";

export async function fetchPretixItemsInfoByEvent(
  client: PoolClient,
  eventInfoId: string
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
  client: PoolClient,
  item_id: string,
  eventInfoId: string,
  item_name: string
): Promise<string> {
  const result = await sqlQuery(
    client,
    `\
      insert into devconnect_pretix_items_info (item_id, devconnect_pretix_events_info_id, item_name)
      values ($1, $2, $3)
      returning id`,
    [item_id, eventInfoId, item_name]
  );
  return result.rows[0].id;
}

export async function updatePretixItemsInfo(
  client: PoolClient,
  id: string,
  item_name: string,
  isDeleted: boolean
): Promise<Array<PretixItemInfo>> {
  const result = await sqlQuery(
    client,
    `\
      update devconnect_pretix_items_info
      set item_name = $1, is_deleted = $3
      where id=$2`,
    [item_name, id, isDeleted]
  );
  return result.rows;
}

export async function softDeletePretixItemInfo(
  client: PoolClient,
  id: string
): Promise<void> {
  await sqlQuery(
    client,
    `update devconnect_pretix_items_info set is_deleted=TRUE where id=$1`,
    [id]
  );
}
