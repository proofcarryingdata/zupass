import { Pool } from "pg";
import {
  DevconnectPretixTicketDB,
  DevconnectPretixTicketDBWithEmailAndItem
} from "../../models";
import { sqlQuery } from "../../sqlQuery";

/*
 * Fetch all users that have a ticket on pretix, even if they haven't
 * logged into the passport app.
 */
export async function fetchAllNonDeletedDevconnectPretixTickets(
  client: Pool
): Promise<Array<DevconnectPretixTicketDB>> {
  const result = await sqlQuery(
    client,
    `\
      select * from devconnect_pretix_tickets where is_deleted = FALSE;`
  );

  return result.rows;
}

/*
 * Fetch users by org and event that have a ticket on pretix, even if they haven't
 * logged into the passport app.
 */
export async function fetchDevconnectPretixTicketsByEvent(
  client: Pool,
  eventConfigID: number
): Promise<Array<DevconnectPretixTicketDB>> {
  const result = await sqlQuery(
    client,
    `\
    select t.* from devconnect_pretix_tickets t
    join devconnect_pretix_items_info i on t.devconnect_pretix_items_info_id = i.id
    join devconnect_pretix_events_info e on e.pretix_events_config_id = i.devconnect_pretix_events_info_id
    where e.pretix_events_config_id = $1`,
    [eventConfigID]
  );

  return result.rows;
}

export async function fetchDevconnectPretixTicketsByEmail(
  client: Pool,
  email: string
): Promise<Array<DevconnectPretixTicketDBWithEmailAndItem>> {
  const result = await sqlQuery(
    client,
    `\
    select t.*, e.event_name, i.item_name from devconnect_pretix_tickets t
    join devconnect_pretix_items_info i on t.devconnect_pretix_items_info_id = i.id
    join devconnect_pretix_events_info e on e.pretix_events_config_id = i.devconnect_pretix_events_info_id
    where t.email = $1
    `,
    [email]
  );
  return result.rows;
}

export async function fetchDevconnectSuperusers(
  client: Pool
): Promise<Array<DevconnectPretixTicketDBWithEmailAndItem>> {
  const result = await sqlQuery(
    client,
    `
select * from devconnect_pretix_tickets t
join devconnect_pretix_items_info i on t.devconnect_pretix_items_info_id = i.id
join devconnect_pretix_events_info e on e.id = i.devconnect_pretix_events_info_id
join pretix_events_config ec on ec.id = e.pretix_events_config_id
where i.item_id = ANY(ec.superuser_item_ids);
    `
  );

  const rows = result.rows;

  return rows;
}

export async function fetchDevconnectSuperusersForEvent(
  client: Pool,
  eventConfigID: number
): Promise<Array<DevconnectPretixTicketDBWithEmailAndItem>> {
  const result = await sqlQuery(
    client,
    `
select * from devconnect_pretix_tickets t
join devconnect_pretix_items_info i on t.devconnect_pretix_items_info_id = i.id
join devconnect_pretix_events_info e on e.id = i.devconnect_pretix_events_info_id
join pretix_events_config ec on ec.id = e.pretix_events_config_id
where i.item_id = ANY(ec.superuser_item_ids)
and ec.id = $1
    `,
    [eventConfigID]
  );

  const rows = result.rows;

  return rows;
}

export async function fetchDevconnectSuperusersForEmail(
  client: Pool,
  email: string
): Promise<Array<DevconnectPretixTicketDBWithEmailAndItem>> {
  const result = await sqlQuery(
    client,
    `
select * from devconnect_pretix_tickets t
join devconnect_pretix_items_info i on t.devconnect_pretix_items_info_id = i.id
join devconnect_pretix_events_info e on e.id = i.devconnect_pretix_events_info_id
join pretix_events_config ec on ec.id = e.pretix_events_config_id
where i.item_id = ANY(ec.superuser_item_ids)
and t.email = $1
    `,
    [email]
  );

  const rows = result.rows;

  return rows;
}
