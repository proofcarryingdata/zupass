import { ClientBase, Pool } from "pg";
import { DateRange } from "../../services/pretixSync";

export async function fetchParticipantEmails(
  client: ClientBase | Pool
): Promise<
  { email: string; role: string; visitor_date_ranges?: DateRange[] }[]
> {
  const result = await client.query(
    `select email, role, visitor_date_ranges from pretix_participants;`
  );
  return result.rows;
}
