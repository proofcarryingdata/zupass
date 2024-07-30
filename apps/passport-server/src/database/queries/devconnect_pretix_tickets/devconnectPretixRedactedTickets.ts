import { Pool, PoolClient } from "postgres-pool";
import { DevconnectPretixRedactedTicket } from "../../models";
import { sqlQuery, sqlTransaction } from "../../sqlQuery";

export async function upsertDevconnectPretixRedactedTicket(
  client: Pool,
  params: DevconnectPretixRedactedTicket
): Promise<void> {
  await sqlQuery(
    client,
    `\
    INSERT INTO devconnect_pretix_redacted_tickets
    (hashed_email, is_consumed, position_id, secret, checker, pretix_checkin_timestamp, devconnect_pretix_items_info_id,
      pretix_events_config_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT(pretix_events_config_id, position_id) DO
    UPDATE SET hashed_email = $1, is_consumed = $2, secret = $4, checker = $5, pretix_checkin_timestamp = $6,
    devconnect_pretix_items_info_id = $7, pretix_events_config_id = $8
    `,
    [
      params.hashed_email,
      params.is_consumed,
      params.position_id,
      params.secret,
      params.checker,
      params.pretix_checkin_timestamp,
      params.devconnect_pretix_items_info_id,
      params.pretix_events_config_id
    ]
  );
}

export async function deleteDevconnectPretixRedactedTickets(
  client: Pool,
  eventConfigID: string,
  ids: string[]
): Promise<void> {
  await sqlQuery(
    client,
    `DELETE FROM devconnect_pretix_redacted_tickets WHERE pretix_events_config_id = $1
    AND position_id = ANY($2)`,
    [eventConfigID, ids]
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
    WHERE t.pretix_events_config_id = $1`,
    [eventConfigID]
  );

  return result.rows;
}

export async function agreeTermsAndUnredactTickets(
  client: Pool,
  userUUID: string,
  version: number
): Promise<void> {
  await sqlTransaction<void>(
    client,
    "agree terms and unredact tickets",
    async (txClient: PoolClient) => {
      await txClient.query(
        "UPDATE users SET terms_agreed = $1 WHERE uuid = $2",
        [version, userUUID]
      );
    }
  );
}
