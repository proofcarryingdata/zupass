import { QueryResultRow } from "pg";
import { PoolClient } from "postgres-pool";
import { HistoricSemaphoreGroup } from "../models";
import { sqlQuery } from "../sqlQuery";

/**
 * Fetches all the latest semaphore group states from the database.
 */
export async function fetchLatestHistoricSemaphoreGroups(
  client: PoolClient
): Promise<HistoricSemaphoreGroup[]> {
  const latestGroups = await sqlQuery(
    client,
    `select s1.* from semaphore_history s1
    join (
      select s2.groupid, max(s2.id) as max_id
      from semaphore_history s2
      group by s2.groupid
    ) groups
    on groups.max_id = s1.id;`
  );

  return latestGroups.rows.map(historicRowToGroup);
}

/**
 * Inserts an updated semaphore group to be the latest historic state for
 * a given group.
 */
export async function insertNewHistoricSemaphoreGroup(
  client: PoolClient,
  groupId: string,
  rootHash: string,
  group: string
): Promise<void> {
  await sqlQuery(
    client,
    `insert into semaphore_history(groupId, rootHash, serializedGroup) values($1, $2, $3);`,
    [groupId, rootHash, group]
  );
}

export async function fetchHistoricGroupByRoot(
  client: PoolClient,
  groupId: string,
  rootHash: string
): Promise<HistoricSemaphoreGroup | undefined> {
  const result = await sqlQuery(
    client,
    `select * from semaphore_history where groupId=$1 and rootHash=$2;`,
    [groupId, rootHash]
  );

  if (result.rowCount === 0) {
    return undefined;
  }

  return historicRowToGroup(result.rows[0]);
}

function historicRowToGroup(row: QueryResultRow): HistoricSemaphoreGroup {
  return {
    id: row.id,
    groupId: row.groupid,
    rootHash: row.roothash,
    serializedGroup: row.serializedgroup,
    timeCreated: row.timecreated
  };
}
