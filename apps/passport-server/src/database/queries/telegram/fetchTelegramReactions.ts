import { Pool } from "postgres-pool";
import { TelegramReactionsCountByMessage } from "../../models";
import { sqlQuery } from "../../sqlQuery";

export async function fetchTelegramReactionsForMessage(
  client: Pool,
  anonMessageId: string
): Promise<TelegramReactionsCountByMessage[]> {
  const result = await sqlQuery(
    client,
    `\
    select reaction, count(*) from telegram_chat_reactions
    where anon_message_id = $1 group by reaction order by reaction desc
    `,
    [anonMessageId]
  );
  return result.rows;
}
