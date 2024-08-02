import { Pool } from "postgres-pool";
import { UserRow, ZuconnectTicketDB } from "../../models";
import { sqlQuery } from "../../sqlQuery";

// TODO
/**
 * Fetches all logged-in users with a non-deleted Zuconnect ticket.
 */
export async function fetchAllLoggedInZuconnectUsers(
  client: Pool
): Promise<
  (Pick<
    ZuconnectTicketDB,
    "attendee_email" | "attendee_name" | "product_id" | "id"
  > &
    UserRow)[]
> {
  const result = await sqlQuery(
    client,
    `\
    SELECT 
        u.*,
        t.attendee_email,
        t.attendee_name,
        t.product_id,
        t.id
    FROM zuconnect_tickets t
    JOIN users u ON u.email = t.attendee_email
    LEFT JOIN email_tokens e ON u.email = e.email
    WHERE t.is_deleted = FALSE`
  );
  return result.rows;
}
