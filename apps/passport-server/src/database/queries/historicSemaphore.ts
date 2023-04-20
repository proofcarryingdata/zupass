import { ClientBase, Pool, QueryResultRow } from "pg";

export interface HistoricSemaphoreGroup {
  id: number;
  groupId: string;
  rootHash: string;
  serializedGroup: string;
  timeCreated: string;
}

export async function getLatestSemaphoreGroups(
  client: ClientBase | Pool
): Promise<HistoricSemaphoreGroup[]> {
  const distinctGroups = await client.query(
    `select distinct(groupid) from semaphore_history;`
  );

  const newestGroups: HistoricSemaphoreGroup[] = [];

  for (const groupId of distinctGroups.rows.map((row) => row.groupid)) {
    const newestGroupId = await client.query(
      `select max(id) from semaphore_history where groupid = $1`,
      [groupId]
    );

    const newestGroup = await client.query(
      `select id, groupId, rootHash, serializedGroup, timeCreated` +
        ` from semaphore_history where id = $1;`,
      [newestGroupId.rows[0].max]
    );

    newestGroups.push(rowToGroup(newestGroup.rows[0]));
  }

  return newestGroups;
}

export async function insertNewSemaphoreGroup(
  client: ClientBase | Pool,
  groupId: string,
  rootHash: string,
  group: string
): Promise<void> {
  await client.query(
    `insert into semaphore_history(groupId, rootHash, serializedGroup) values($1, $2, $3);`,
    [groupId, rootHash, group]
  );
}

export async function getGroupByRoot(
  client: ClientBase | Pool,
  rootHash: string,
  groupId: string
): Promise<HistoricSemaphoreGroup | undefined> {
  const rows = await client.query(
    `select * from semaphore_history where rootHash=$1 and groupId=$2;`,
    [rootHash, groupId]
  );

  if (rows.rowCount === 0) {
    return undefined;
  }

  return rowToGroup(rows.rows[0]);
}

function rowToGroup(row: QueryResultRow): HistoricSemaphoreGroup {
  return {
    id: row.id,
    groupId: row.groupid,
    rootHash: row.roothash,
    serializedGroup: row.serializedgroup,
    timeCreated: row.timecreated,
  };
}
