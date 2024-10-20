import { PoolClient } from "postgres-pool";
import { UserRow, ZuconnectTicketDB } from "../../models";
import { sqlQuery } from "../../sqlQuery";

export type ZuconnectTicketInfo = Pick<
  ZuconnectTicketDB,
  "attendee_email" | "attendee_name" | "product_id" | "id"
>;

export type LoggedInZuconnectUser = UserRow & {
  zuconnectTickets: ZuconnectTicketInfo[];
};

/**
 * Fetches all logged-in users with a non-deleted Zuconnect ticket.
 */
export async function fetchAllLoggedInZuconnectUsers(
  client: PoolClient
): Promise<LoggedInZuconnectUser[]> {
  const result = await sqlQuery(
    client,
    `\
SELECT 
        u.*,
        array_agg(distinct ue.email) as emails,
        array_agg(t.attendee_email) as attendee_emails,
        array_agg(t.attendee_name) as attendee_names,
        array_agg(t.product_id) as attendee_product_ids,
        array_agg(t.id) as attendee_ticket_ids
    FROM zuconnect_tickets t
    JOIN user_emails ue on ue.email = t.attendee_email
    JOIN users u ON u.uuid = ue.user_id
    JOIN email_tokens e ON ue.email = e.email
    WHERE t.is_deleted = false
    group by u.uuid;`
  );

  const usersWithTickets: LoggedInZuconnectUser[] = [];

  for (const row of result.rows) {
    const user = {
      uuid: row.uuid,
      // Semaphore v3 commitment.
      commitment: row.commitment,
      emails: row.emails,
      salt: row.salt,
      encryption_key: row.encryption_key,
      terms_agreed: row.terms_agreed,
      extra_issuance: row.extra_issuance,
      time_created: row.time_created,
      time_updated: row.time_updated,
      semaphore_v4_pubkey: row.semaphore_v4_pubkey,
      semaphore_v4_commitment: row.semaphore_v4_commitment
    } satisfies UserRow;

    const zuconnectTickets: ZuconnectTicketInfo[] = [];

    for (let i = 0; i < row.attendee_names.length; i++) {
      zuconnectTickets.push({
        attendee_email: row.attendee_emails[i],
        attendee_name: row.attendee_names[i],
        id: row.attendee_names[i],
        product_id: row.attendee_product_ids[i]
      } satisfies ZuconnectTicketInfo);
    }

    usersWithTickets.push({ ...user, zuconnectTickets });
  }

  return usersWithTickets;
}
