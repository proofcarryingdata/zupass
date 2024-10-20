import { PoolClient } from "postgres-pool";
import { PretixEventInfo, PretixItemInfo } from "../models";
import { sqlQuery } from "../sqlQuery";

export async function fetchPretixEventInfo(
  client: PoolClient,
  eventConfigID: string
): Promise<PretixEventInfo | null> {
  const result = await sqlQuery(
    client,
    `\
      select *
      from devconnect_pretix_events_info
      where pretix_events_config_id = $1`,
    [eventConfigID]
  );

  return result.rowCount ? result.rows[0] : null;
}

export async function insertPretixEventsInfo(
  client: PoolClient,
  eventName: string,
  eventsConfigID: string,
  checkinListId: string
): Promise<string> {
  const result = await sqlQuery(
    client,
    // @todo consider upsert?
    `\
      insert into devconnect_pretix_events_info (event_name, pretix_events_config_id, checkin_list_id, is_deleted)
      values ($1, $2, $3, FALSE)
      returning id`,
    [eventName, eventsConfigID, checkinListId]
  );
  return result.rows[0].id;
}

export async function updatePretixEventsInfo(
  client: PoolClient,
  id: string,
  eventName: string,
  isDeleted: boolean,
  checkinListId: string
): Promise<Array<PretixItemInfo>> {
  const result = await sqlQuery(
    client,
    `\
      update devconnect_pretix_events_info
      set event_name = $2, is_deleted = $3, checkin_list_id = $4
      where id=$1`,
    [id, eventName, isDeleted, checkinListId]
  );
  return result.rows;
}

export async function softDeletePretixEventsInfo(
  client: PoolClient,
  id: number
): Promise<void> {
  await sqlQuery(
    client,
    `update devconnect_pretix_events_info set is_deleted=true where id=$1`,
    [id]
  );
}

export async function fetchPretixEventInfoByName(
  client: PoolClient,
  eventName: string
): Promise<PretixEventInfo | null> {
  const result = await sqlQuery(
    client,
    `\
      select *
      from devconnect_pretix_events_info
      where event_name = $1`,
    [eventName]
  );

  return result.rowCount ? result.rows[0] : null;
}
