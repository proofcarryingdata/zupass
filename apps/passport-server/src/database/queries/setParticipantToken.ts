import { ClientBase, Pool } from "pg";
import { PretixParticipant } from "../models";

// Sets the email auth token for a given Pretix participant.
// Returns null if not found. Returns full participant info on success.
export async function setParticipantToken(
  client: ClientBase | Pool,
  params: {
    email: string;
    token: string;
  }
): Promise<(PretixParticipant & { commitment?: string }) | null> {
  const { email, token } = params;

  // Insert succeeds only if we already have a Pretix participant (but don't
  // already have a commitment) for this email--due to foreign + unique keys.
  const result = await client.query(
    `\
update pretix_participants
set email_token = $2
where email = $1`,
    [email, token]
  );
  if (result.rowCount == 0) return null;

  const pp = await client.query(
    `\
select p.email, p.name, p.role, p.residence, p.email_token, c.commitment
from pretix_participants p
left join commitments c on p.email = c.participant_email
where p.email = $1`,
    [email]
  );
  return pp.rows[0] || null;
}
