import { Pool } from "postgres-pool";
import { DevconnectPretixRedactedTicket } from "../../models";
import { sqlQuery } from "../../sqlQuery";
import { insertDevconnectPretixTicket } from "./insertDevconnectPretixTicket";

export async function insertDevconnectPretixRedactedTicket(
  client: Pool,
  params: DevconnectPretixRedactedTicket
): Promise<void> {
  await sqlQuery(
    client,
    `\
    INSERT INTO devconnect_pretix_redacted_tickets
    (hashed_email, is_consumed, position_id, secret, checker, pretix_checkin_timestamp, devconnect_pretix_items_info_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT(position_id) DO
    UPDATE SET hashed_email = $1, is_consumed = $2, secret = $4, checker = $5, pretix_checkin_timestamp = $6,
    devconnect_pretix_items_info_id = $7 
    `,
    [
      params.hashed_email,
      params.is_consumed,
      params.position_id,
      params.secret,
      params.checker,
      params.pretix_checkin_timestamp,
      params.devconnect_pretix_items_info_id
    ]
  );
}

export async function deleteDevconnectPretixRedactedTicketsByPositionIds(
  client: Pool,
  ids: string[]
): Promise<void> {
  await sqlQuery(
    client,
    `DELETE FROM devconnect_pretix_redacted_tickets WHERE position_id IN($1)`,
    [ids]
  );
}

export async function fetchDevconnectPretixRedactedTicketsByHashedEmail(
  client: Pool,
  hashedEmail: string
): Promise<DevconnectPretixRedactedTicket[]> {
  const result = await sqlQuery(
    client,
    `\
    SELECT * FROM devconnect_pretix_redacted_tickets
    WHERE hashed_email = $1
    `,
    [hashedEmail]
  );

  return result.rows;
}

export async function fetchDevconnectPretixRedactedTicketsByEvent(
  client: Pool,
  eventConfigID: string
): Promise<DevconnectPretixRedactedTicket[]> {
  const result = await sqlQuery(
    client,
    `\
    SELECT t.* FROM devconnect_pretix_redacted_tickets t
    JOIN devconnect_pretix_items_info i ON t.devconnect_pretix_items_info_id = i.id
    JOIN devconnect_pretix_events_info e ON e.id = i.devconnect_pretix_events_info_id
    WHERE e.pretix_events_config_id = $1`,
    [eventConfigID]
  );

  return result.rows;
}

export async function unredactDevconnectPretixTicket(
  client: Pool,
  email: string,
  hashedEmail: string
): Promise<void> {
  const redacted = await fetchDevconnectPretixRedactedTicketsByHashedEmail(
    client,
    hashedEmail
  );

  for (const redactedTicket of redacted) {
    await insertDevconnectPretixTicket(client, {
      ...redactedTicket,
      email,
      full_name: "",
      is_deleted: false,
      zupass_checkin_timestamp: null
    });
  }

  await sqlQuery(
    client,
    `DELETE FROM devconnect_pretix_redacted_tickets WHERE hashed_email = $1`,
    [hashedEmail]
  );
}
