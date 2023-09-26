import { Pool } from "postgres-pool";
import { logger } from "../../util/logger";
import { EncryptedStorageModel } from "../models";
import { sqlQuery } from "../sqlQuery";

/**
 * Returns the encrypted data stored with a given key.
 */
export async function fetchEncryptedStorage(
  dbPool: Pool,
  blobKey: string
): Promise<EncryptedStorageModel | undefined> {
  const results = await sqlQuery(
    dbPool,
    "select * from e2ee where blob_key = $1;",
    [blobKey]
  );

  if (!results.rows[0]) {
    return undefined;
  }

  return results.rows[0] as EncryptedStorageModel;
}

/**
 * Replaces the encrypted data stored at a particular encryption key
 */
export async function insertEncryptedStorage(
  dbPool: Pool,
  blobKey: string,
  encryptedBlob: string
): Promise<void> {
  await sqlQuery(
    dbPool,
    "insert into e2ee(blob_key, encrypted_blob) values " +
      "($1, $2) on conflict(blob_key) do update set encrypted_blob = $2;",
    [blobKey, encryptedBlob]
  );
}

/**
 * Transactionally deletes row at at the old blob key,
 * upserts the encrypted data stored at the new blob key,
 * and then updates the user's salt.
 */
// TODO: Add retry logic for this query
export async function updateEncryptedStorage(
  dbPool: Pool,
  oldBlobKey: string,
  newBlobKey: string,
  uuid: string,
  newSalt: string,
  encryptedBlob: string
): Promise<void> {
  // Based on recommended transaction flow, where queries are isolated to a particular client.
  // https://node-postgres.com/features/transactions.
  const txClient = await dbPool.connect();
  try {
    await txClient.query("BEGIN");
    await txClient.query("DELETE FROM e2ee WHERE blob_key = $1", [oldBlobKey]);
    await txClient.query(
      `INSERT INTO e2ee(blob_key, encrypted_blob) VALUES
      ($1, $2) ON CONFLICT(blob_key) DO UPDATE SET encrypted_blob = $1`,
      [newBlobKey, encryptedBlob]
    );
    await txClient.query("UPDATE commitments SET salt = $2 WHERE uuid = $1", [
      uuid,
      newSalt
    ]);
    await txClient.query("COMMIT");
  } catch (queryError) {
    try {
      await txClient.query("ROLLBACK");
    } catch (rollbackError) {
      logger(`Rollback for updateEncryptedStorage failed: ${rollbackError}`);
    }
    throw queryError;
  } finally {
    txClient.release();
  }
}

/**
 * Fetches the amount of end to end encrypted storage saved in this database.
 */
export async function fetchE2EEStorageCount(dbPool: Pool): Promise<number> {
  const result = await sqlQuery(dbPool, `select count(*) as count from e2ee`);
  return parseInt(result.rows[0].count, 10);
}
