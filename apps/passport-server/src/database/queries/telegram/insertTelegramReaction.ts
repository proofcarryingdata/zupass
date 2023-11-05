import { Pool } from "postgres-pool";
import { sqlQuery } from "../../sqlQuery";

export async function insertTelegramReaction(
  client: Pool,
  proof: string,
  anonMessageId: string,
  reaction: string
): Promise<number> {
  const result = await sqlQuery(
    client,
    `\
insert into telegram_chat_reactions (proof, anon_message_id, reaction)
values ($1, $2, $3)`,
    [proof, anonMessageId, reaction]
  );
  return result.rowCount;
}
