import { PoolClient } from "postgres-pool";
import { ZuconnectTicketDB } from "../../models";
import { sqlQuery } from "../../sqlQuery";

/**
 * Fetches all non-deleted Zuconnect Tickets.
 */
export async function fetchAllZuconnectTickets(
  client: PoolClient
): Promise<ZuconnectTicketDB[]> {
  const result = await sqlQuery(
    client,
    `\
      SELECT * FROM zuconnect_tickets WHERE is_deleted = FALSE`
  );

  return result.rows;
}

/**
 * Fetches the IDs of all non-deleted Zuconnect tickets.
 */
export async function fetchAllZuconnectTicketIds(
  client: PoolClient
): Promise<ZuconnectTicketDB["id"][]> {
  const result = await sqlQuery(
    client,
    `\
    SELECT id FROM zuconnect_tickets WHERE is_deleted = FALSE
    `
  );

  return result.rows.map((row) => row.ticket_id);
}

/**
 * Fetches all Zuconnect tickets with a given email address.
 */
export async function fetchZuconnectTicketsByEmail(
  client: PoolClient,
  email: string
): Promise<ZuconnectTicketDB[]> {
  const result = await sqlQuery(
    client,
    `\
      SELECT * FROM zuconnect_tickets WHERE attendee_email = $1
      AND is_deleted = FALSE`,
    [email]
  );

  return result.rows;
}

/**
 * Fetches a Zuconnect ticket by ID.
 */
export async function fetchZuconnectTicketById(
  client: PoolClient,
  id: string
): Promise<ZuconnectTicketDB | undefined> {
  const result = await sqlQuery(
    client,
    `\
    SELECT * FROM zuconnect_tickets WHERE id = $1 AND is_deleted = FALSE
    `,
    [id]
  );

  return result.rows[0];
}
