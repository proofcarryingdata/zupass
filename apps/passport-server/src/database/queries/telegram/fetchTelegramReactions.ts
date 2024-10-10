import { PoolClient } from "postgres-pool";
import { TelegramReactionCount } from "../../models";
import { sqlQuery } from "../../sqlQuery";

export async function fetchTelegramReactionsForMessage(
  client: PoolClient,
  anonMessageId: string
): Promise<TelegramReactionCount[]> {
  const result = await sqlQuery(
    client,
    `\
    select
      reaction,
      count(*):: int
    from
      telegram_chat_reactions
    where
      anon_message_id = $1
    group by
      reaction
    order by
      reaction desc;
    `,
    [anonMessageId]
  );
  return result.rows;
}

export async function fetchTelegramTotalKarmaForNullifier(
  client: PoolClient,
  nulliferHash: string
): Promise<number> {
  const result = await sqlQuery(
    client,
    `\
    select
      distinct sender_nullifier,
      anon_message_id
    from
      telegram_chat_reactions r
      join telegram_chat_anon_messages m on m.id = r.anon_message_id
    where
      m.nullifier = $1;
  `,
    [nulliferHash]
  );
  return result.rowCount;
}
