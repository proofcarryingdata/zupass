import { PoolClient } from "postgres-pool";
import {
  DevconnectPretixTicketDB,
  DevconnectPretixTicketDBWithCheckinListID,
  DevconnectPretixTicketDBWithEmailAndItem,
  DevconnectProduct,
  DevconnectSuperuser
} from "../../models";
import { sqlQuery } from "../../sqlQuery";

/*
 * Fetch all unredacted tickets (tickets belonging to users who have logged)
 * in and accepted legal/privacy terms.
 */
export async function fetchAllNonDeletedDevconnectPretixTickets(
  client: PoolClient
): Promise<Array<DevconnectPretixTicketDB>> {
  const result = await sqlQuery(
    client,
    `\
      select * from devconnect_pretix_tickets where is_deleted = FALSE;`
  );

  return result.rows;
}

/*
 * Fetch tickets for a given event.
 * Won't fetch tickets for users who have not logged in, as those tickets
 * would be redacted.
 */
export async function fetchDevconnectPretixTicketsByEvent(
  client: PoolClient,
  eventConfigID: string
): Promise<Array<DevconnectPretixTicketDBWithEmailAndItem>> {
  const result = await sqlQuery(
    client,
    `\
    select ei.event_name, ii.item_name, t.* 
    from devconnect_pretix_tickets t
    left join devconnect_pretix_events_info ei on ei.pretix_events_config_id = t.pretix_events_config_id
    left join devconnect_pretix_items_info ii on ii.devconnect_pretix_events_info_id = ei.id and ii.id = t.devconnect_pretix_items_info_id
    where t.pretix_events_config_id = $1 and t.is_deleted = false`,
    [eventConfigID]
  );

  return result.rows;
}

/*
 * Fetch a devconnect ticket by its unique internal id.
 */
export async function fetchDevconnectPretixTicketByTicketId(
  client: PoolClient,
  ticketId: string
): Promise<DevconnectPretixTicketDBWithEmailAndItem | undefined> {
  const result = await sqlQuery(
    client,
    `\
    select t.*, e.event_name, i.item_name, e.pretix_events_config_id as pretix_events_config_id from devconnect_pretix_tickets t
    join devconnect_pretix_items_info i on t.devconnect_pretix_items_info_id = i.id
    join devconnect_pretix_events_info e on e.id = i.devconnect_pretix_events_info_id
    where t.id = $1
    and t.is_deleted = false`,
    [ticketId]
  );

  return result.rows[0];
}

export async function fetchDevconnectPretixTicketsByEmail(
  client: PoolClient,
  email: string
): Promise<Array<DevconnectPretixTicketDBWithEmailAndItem>> {
  const result = await sqlQuery(
    client,
    `\
    select t.*, e.event_name, i.item_name, e.pretix_events_config_id as pretix_events_config_id from devconnect_pretix_tickets t
    join devconnect_pretix_items_info i on t.devconnect_pretix_items_info_id = i.id
    join devconnect_pretix_events_info e on e.id = i.devconnect_pretix_events_info_id
    where t.email = $1
    and t.is_deleted = false
    order by t.id asc
    `,
    [email]
  );
  return result.rows;
}

export async function fetchDevconnectSuperusers(
  client: PoolClient
): Promise<Array<DevconnectSuperuser>> {
  const result = await sqlQuery(
    client,
    `
select *, t.id as ticket_id from devconnect_pretix_tickets t
join devconnect_pretix_items_info i on t.devconnect_pretix_items_info_id = i.id
join devconnect_pretix_events_info e on e.id = i.devconnect_pretix_events_info_id
join pretix_events_config ec on ec.id = e.pretix_events_config_id
where i.item_id = ANY(ec.superuser_item_ids)
and t.is_deleted = false;
    `
  );
  return result.rows;
}

export async function fetchDevconnectSuperusersForEvent(
  client: PoolClient,
  eventConfigID: string
): Promise<Array<DevconnectSuperuser>> {
  const result = await sqlQuery(
    client,
    `
select *, t.id as ticket_id from devconnect_pretix_tickets t
join devconnect_pretix_items_info i on t.devconnect_pretix_items_info_id = i.id
join devconnect_pretix_events_info e on e.id = i.devconnect_pretix_events_info_id
join pretix_events_config ec on ec.id = e.pretix_events_config_id
where i.item_id = ANY(ec.superuser_item_ids)
and ec.id = $1
and t.is_deleted = false
    `,
    [eventConfigID]
  );
  return result.rows;
}

export async function fetchDevconnectSuperusersForEmail(
  client: PoolClient,
  email: string
): Promise<Array<DevconnectSuperuser>> {
  const result = await sqlQuery(
    client,
    `
select *, t.id as ticket_id from devconnect_pretix_tickets t
join devconnect_pretix_items_info i on t.devconnect_pretix_items_info_id = i.id
join devconnect_pretix_events_info e on e.id = i.devconnect_pretix_events_info_id
join pretix_events_config ec on ec.id = e.pretix_events_config_id
where i.item_id = ANY(ec.superuser_item_ids)
and t.email = $1
and t.is_deleted = false
    `,
    [email]
  );
  return result.rows;
}

/**
 * Fetches tickets which have been consumed in Zupass, but not checked in
 * on Pretix.
 */
export async function fetchDevconnectTicketsAwaitingSync(
  client: PoolClient,
  orgUrl: string
): Promise<Array<DevconnectPretixTicketDBWithCheckinListID>> {
  const result = await sqlQuery(
    client,
    `\
      select t.*, e.event_name, i.item_name, e.pretix_events_config_id as pretix_events_config_id,
      e.checkin_list_id from devconnect_pretix_tickets t
      join devconnect_pretix_items_info i on t.devconnect_pretix_items_info_id = i.id
      join devconnect_pretix_events_info e on e.id = i.devconnect_pretix_events_info_id
      join pretix_events_config ec on ec.id = e.pretix_events_config_id
      join pretix_organizers_config o on ec.pretix_organizers_config_id = o.id
      where o.organizer_url = $1
      and t.is_deleted = false
      and t.is_consumed = true
      and t.pretix_checkin_timestamp IS NULL`,
    [orgUrl]
  );

  return result.rows;
}

export async function fetchDevconnectProducts(
  client: PoolClient
): Promise<DevconnectProduct[]> {
  const result = await sqlQuery(
    client,
    `\
  SELECT i.id AS product_id, e.pretix_events_config_id AS event_id
  FROM devconnect_pretix_items_info i
  JOIN devconnect_pretix_events_info e ON e.id = i.devconnect_pretix_events_info_id
`
  );

  return result.rows;
}
