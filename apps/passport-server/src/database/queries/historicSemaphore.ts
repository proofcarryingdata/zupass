import { ClientBase, Pool } from "pg";

interface HistoricSemaphoreGroup {
  id: number;
  groupId: string;
  rootHash: string;
  group: string;
  timeCreated: string;
}

export async function getLatestSemaphoreGroups(client: ClientBase | Pool) {
  const result = await client.query(`
    select * from SemaphoreHistory
    order by max(id)
    group by groupId;
  `);

  return result.rows as HistoricSemaphoreGroup[];
}
