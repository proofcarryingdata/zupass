import { Pool } from "postgres-pool";
import { ZuconnectTicketDB } from "../../models";
import { sqlQuery } from "../../sqlQuery";

/**
 * Fetches all non-deleted Zuconnect Tickets.
 */
export async function fetchAllZuconnectTickets(
  client: Pool
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
  client: Pool
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
  client: Pool,
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
