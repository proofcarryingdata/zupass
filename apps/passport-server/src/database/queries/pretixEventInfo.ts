import { Pool } from "pg";
import { PretixEventInfo, PretixItemInfo } from "../models";
import { sqlQuery } from "../sqlQuery";

export async function fetchPretixEventInfo(
  client: Pool,
  eventConfigID: number
): Promise<PretixEventInfo | null> {
  const result = await sqlQuery(
    client,
    `\
      select *
      from devconnect_pretix_events_info
      where id = $1`,
    [eventConfigID]
  );

  return result.rowCount ? result.rows[0] : null;
}

export async function insertPretixEventsInfo(
  client: Pool,
  eventName: string,
  eventsConfigID: number
): Promise<Array<PretixItemInfo>> {
  const result = await sqlQuery(
    client,
    `\
      insert into devconnect_pretix_events_info (event_name, pretix_events_config_id)
      values ($1, $2)`,
    [eventName, eventsConfigID]
  );
  return result.rows;
}

export async function updatePretixEventsInfo(
  client: Pool,
  id: number,
  eventName: string
): Promise<Array<PretixItemInfo>> {
  const result = await sqlQuery(
    client,
    `\
      update devconnect_pretix_events_info
      set event_name = $2
      where id=$1`,
    [id, eventName]
  );
  return result.rows;
}

export async function deletePretixItemInfo(
  client: Pool,
  id: number
): Promise<void> {
  await sqlQuery(
    client,
    `delete from devconnect_pretix_events_info where id=$1`,
    [id]
  );
}
