import { ClientBase, Pool, QueryResultRow } from "pg";

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

  return result.rows.map(rowToGroup) as HistoricSemaphoreGroup[];
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

export async function getGroupByRoot(
  client: ClientBase | Pool,
  rootHash: string,
  groupId: string
): Promise<HistoricSemaphoreGroup | undefined> {
  const rows = await client.query(
    `select * from SemaphoreHistory where rootHash=$1 and groupId=$2;`,
    [rootHash, groupId]
  );

  if (rows.rowCount === 0) {
    return undefined;
  }

  return rowToGroup(rows.rows[0]);
}

function rowToGroup(row: QueryResultRow): HistoricSemaphoreGroup {
  return {
    id: row[0],
    groupId: row[1],
    rootHash: row[2],
    group: row[3],
    timeCreated: row[4],
  };
}
