import { Pool } from "postgres-pool";
import { PretixEventInfo, PretixItemInfo } from "../models";
import { sqlQuery } from "../sqlQuery";

export async function fetchPretixEventInfo(
  client: Pool,
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
  client: Pool,
  eventName: string,
  eventsConfigID: string
): Promise<string> {
  const result = await sqlQuery(
    client,
    `\
      insert into devconnect_pretix_events_info (event_name, pretix_events_config_id)
      values ($1, $2)
      returning id`,
    [eventName, eventsConfigID]
  );
  return result.rows[0].id;
}

export async function updatePretixEventsInfo(
  client: Pool,
  id: string,
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

export async function deletePretixEventsInfo(
  client: Pool,
  id: number
): Promise<void> {
  await sqlQuery(
    client,
    `delete from devconnect_pretix_events_info where id=$1`,
    [id]
  );
}
