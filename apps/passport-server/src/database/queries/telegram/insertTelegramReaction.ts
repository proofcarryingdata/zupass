import { PoolClient } from "postgres-pool";
import { sqlQuery } from "../../sqlQuery";

export async function insertTelegramReaction(
  client: PoolClient,
  proof: string,
  anonMessageId: string,
  reaction: string,
  senderNullifier: string
): Promise<number> {
  const result = await sqlQuery(
    client,
    `\
insert into telegram_chat_reactions (proof, anon_message_id, reaction, sender_nullifier)
values ($1, $2, $3, $4)`,
    [proof, anonMessageId, reaction, senderNullifier]
  );
  return result.rowCount;
}
