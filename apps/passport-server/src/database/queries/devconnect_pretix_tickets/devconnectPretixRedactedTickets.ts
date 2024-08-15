import { Pool, PoolClient } from "postgres-pool";
import { sqlTransaction } from "../../sqlQuery";

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
