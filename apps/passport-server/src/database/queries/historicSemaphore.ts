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
  const latestGroups = await client.query(
    `select s1.* from semaphore_history s1
    join (
      select s2.groupid, max(s2.id) as max_id
      from semaphore_history s2
      group by s2.groupid
    ) groups
    on groups.max_id = s1.id;`
  );

  return latestGroups.rows.map(rowToGroup);
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
  groupId: string,
  rootHash: string
): Promise<HistoricSemaphoreGroup | undefined> {
  const result = await client.query(
    `select * from semaphore_history where groupId=$1 and rootHash=$2;`,
    [groupId, rootHash]
  );

  if (result.rowCount === 0) {
    return undefined;
  }

  return rowToGroup(result.rows[0]);
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
