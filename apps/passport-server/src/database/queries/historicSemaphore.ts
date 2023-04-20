import { ClientBase, Pool } from "pg";

interface HistoricSemaphoreGroup {
  id: number;
  groupId: string;
  rootHash: string;
  group: string;
  timeCreated: string;
}

export async function getLatestSemaphoreGroups(
  client: ClientBase | Pool
): Promise<HistoricSemaphoreGroup[]> {
  const result = await client.query(`
    select * from SemaphoreHistory
    order by max(id)
    group by groupId;
  `);

  return result.rows as HistoricSemaphoreGroup[];
}

export async function insertNewSemaphoreGroup(
  client: ClientBase | Pool,
  groupId: string,
  rootHash: string,
  group: string
): Promise<void> {
  await client.query(
    `insert into SemaphoreHistory(groupId, rootHash, group) values($1, $2, $3);`,
    [groupId, rootHash, group]
  );
}
