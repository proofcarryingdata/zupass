import { Pool } from "postgres-pool";
import { ZuconnectTicketDB } from "../../models";
import { sqlQuery } from "../../sqlQuery";

/**
 * Inserts or updates a Zuconnect ticket and returns the inserted ticket.
 */
export async function upsertZuconnectTicket(
  client: Pool,
  params: Omit<ZuconnectTicketDB, "id">
): Promise<ZuconnectTicketDB> {
  const result = await sqlQuery(
    client,
    `\
    INSERT INTO zuconnect_tickets
    (external_ticket_id, attendee_email, attendee_name, product_id, is_deleted, is_mock_ticket, extra_info)
    VALUES($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT(external_ticket_id)
    DO UPDATE SET attendee_email = $2, attendee_name = $3,
    product_id = $4, is_deleted = FALSE, extra_info = $7
    RETURNING *`,
    [
      params.external_ticket_id,
      params.attendee_email,
      params.attendee_name,
      params.product_id,
      params.is_deleted,
      params.is_mock_ticket,
      params.extra_info
    ]
  );

  return result.rows[0];
}

/**
 * Soft-deletes a Zuconnect ticket.
 */
export async function softDeleteZuconnectTicket(
  client: Pool,
  external_ticket_id: string
): Promise<void> {
  await sqlQuery(
    client,
    `UPDATE zuconnect_tickets SET is_deleted = TRUE WHERE external_ticket_id = $1`,
    [external_ticket_id]
  );
}
