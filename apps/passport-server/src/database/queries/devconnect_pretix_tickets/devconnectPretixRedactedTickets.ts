import { PoolClient } from "postgres-pool";

export async function agreeTermsAndUnredactTickets(
  client: PoolClient,
  userUUID: string,
  version: number
): Promise<void> {
  await client.query("UPDATE users SET terms_agreed = $1 WHERE uuid = $2", [
    version,
    userUUID
  ]);
}
