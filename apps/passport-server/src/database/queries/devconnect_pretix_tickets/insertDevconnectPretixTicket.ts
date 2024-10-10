import { PoolClient } from "postgres-pool";
import {
  DevconnectPretixTicketWithCheckin,
  DevconnectPretixTicketWithCheckinDB
} from "../../models";
import { sqlQuery } from "../../sqlQuery";

/**
 * Insert a Devconnect pretix ticket into the database, if they have not been
 * inserted yet. This does not insert an identity commitment for them.
 */
export async function insertDevconnectPretixTicket(
  client: PoolClient,
  params: DevconnectPretixTicketWithCheckin
): Promise<DevconnectPretixTicketWithCheckinDB> {
  const result = await sqlQuery(
    client,
    `\
insert into devconnect_pretix_tickets
(email, full_name, devconnect_pretix_items_info_id, pretix_events_config_id,
  is_deleted, is_consumed, position_id, secret, checker,
  zupass_checkin_timestamp, pretix_checkin_timestamp)
values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
on conflict (pretix_events_config_id, position_id) do
update set email = $1, full_name = $2, devconnect_pretix_items_info_id = $3,
pretix_events_config_id = $4, is_deleted = $5, is_consumed = $6, secret = $8,
checker = $9, zupass_checkin_timestamp = $10, pretix_checkin_timestamp = $11
returning *`,
    [
      params.email,
      params.full_name,
      params.devconnect_pretix_items_info_id,
      params.pretix_events_config_id,
      params.is_deleted,
      params.is_consumed,
      params.position_id,
      params.secret,
      params.checker,
      params.zupass_checkin_timestamp,
      params.pretix_checkin_timestamp
    ]
  );
  return result.rows[0];
}
