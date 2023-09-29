import { Pool } from "postgres-pool";
import { DevconnectPretixTicketWithCheckin } from "../../models";
import { sqlQuery } from "../../sqlQuery";

/**
 * Insert a Devconnect pretix ticket into the database, if they have not been
 * inserted yet. This does not insert an identity commitment for them.
 */
export async function insertDevconnectPretixTicket(
  client: Pool,
  params: DevconnectPretixTicketWithCheckin
): Promise<DevconnectPretixTicketWithCheckin> {
  const result = await sqlQuery(
    client,
    `\
insert into devconnect_pretix_tickets
(email, full_name, devconnect_pretix_items_info_id, is_deleted, is_consumed, position_id,
  secret, checker, zupass_checkin_timestamp, pretix_checkin_timestamp)
values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
on conflict (position_id) do
update set email = $1, full_name = $2, devconnect_pretix_items_info_id = $3,
is_deleted = $4, is_consumed = $5, secret = $7, checker = $8,
zupass_checkin_timestamp = $9, pretix_checkin_timestamp = $10
returning *`,
    [
      params.email,
      params.full_name,
      params.devconnect_pretix_items_info_id,
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
