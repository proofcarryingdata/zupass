import { PoolClient } from "postgres-pool";
import { DevconnectPretixTicketWithCheckin } from "../../models";
import { sqlQuery } from "../../sqlQuery";

/**
 * Updates a pretix ticket in our database.
 */
export async function updateDevconnectPretixTicket(
  client: PoolClient,
  params: DevconnectPretixTicketWithCheckin
): Promise<DevconnectPretixTicketWithCheckin> {
  const result = await sqlQuery(
    client,
    `\
update devconnect_pretix_tickets
set full_name=$1, is_deleted=$2, secret=$3, is_consumed=$4, checker=$5,
zupass_checkin_timestamp=$6, pretix_checkin_timestamp=$7, email=$8
where position_id=$9 and pretix_events_config_id = $10
returning *`,
    [
      params.full_name,
      params.is_deleted,
      params.secret,
      params.is_consumed,
      params.checker,
      params.zupass_checkin_timestamp,
      params.pretix_checkin_timestamp,
      params.email,
      params.position_id,
      params.pretix_events_config_id
    ]
  );
  return result.rows[0];
}

/**
 * Updates a non-deleted, unconsumed pretix ticket in our database
 * to toggle on `is_consumed` state, returning the row if it exists.
 */
export async function consumeDevconnectPretixTicket(
  client: PoolClient,
  id: string,
  checkerEmail: string
): Promise<boolean> {
  const result = await sqlQuery(
    client,
    `update devconnect_pretix_tickets
    set is_consumed=TRUE, checker=$2, zupass_checkin_timestamp=$3
    where id=$1 and is_deleted=FALSE and is_consumed=FALSE
    returning id`,
    [id, checkerEmail, new Date()]
  );
  return result.rowCount === 1;
}
