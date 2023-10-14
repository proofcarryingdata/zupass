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

export async function deleteAllDevconnectPretixRedactedTicketsForProducts(
  client: Pool,
  itemIds: string[]
): Promise<void> {
  await sqlQuery(
    client,
    `DELETE FROM devconnect_pretix_redacted_tickets
       WHERE devconnect_pretix_items_info_id IN
       (SELECT id FROM devconnect_pretix_items_info WHERE item_id IN($1))`,
    [itemIds]
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
}
