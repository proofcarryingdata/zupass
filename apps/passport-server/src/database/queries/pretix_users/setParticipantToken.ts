import { ClientBase, Pool } from "pg";
import { sqlQuery } from "../../sqlQuery";

// Sets the email auth token for a given Pretix participant.
// Returns null if not found. Returns full participant info on success.
export async function setEmailToken(
  client: ClientBase | Pool,
  params: {
    email: string;
    token: string;
  }
): Promise<void> {
  const { email, token } = params;

  await sqlQuery(
    client,
    `\
insert into email_tokens(email, token, timeUpdated, timeCreated) values($1, $2, NOW(), NOW())
on conflict set token = $2, timeUpdated = NOW();`,
    [email, token]
  );
}
