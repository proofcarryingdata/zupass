import { Pool, PoolClient } from "postgres-pool";
import { EncryptedStorageModel } from "../models";
import { sqlQuery, sqlTransaction } from "../sqlQuery";

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
 * Inserts or replaces the encrypted data stored at a particular encryption key.
 * Revision number is updated and returned but not checked.
 */
export async function insertEncryptedStorage(
  dbPool: Pool,
  blobKey: string,
  encryptedBlob: string
): Promise<string> {
  const result = await sqlQuery(
    dbPool,
    "insert into e2ee(blob_key, encrypted_blob) values ($1, $2) " +
      "on conflict(blob_key) do update " +
      "set encrypted_blob = $2, revision = e2ee.revision + 1 " +
      "returning revision;",
    [blobKey, encryptedBlob]
  );
  return result.rows[0].revision;
}

/**
 * Transactionally performs the changes required to change a user's password
 * (key) for E2EE storage.  Deletes row at at the old blob key, upserts the
 * encrypted data stored at the new blob key, and then updates the user's salt.
 * The return value is the resulting revision
 */
export async function rekeyEncryptedStorage(
  dbPool: Pool,
  oldBlobKey: string,
  newBlobKey: string,
  uuid: string,
  newSalt: string,
  encryptedBlob: string
): Promise<string> {
  return sqlTransaction(
    dbPool,
    "rekey encrypted storage",
    async (txClient: PoolClient) => {
      const updateResult = await txClient.query(
        `UPDATE e2ee
        SET blob_key = $2, encrypted_blob = $3, revision = revision + 1
        WHERE blob_key = $1
        RETURNING revision`,
        [oldBlobKey, newBlobKey, encryptedBlob]
      );
      if (0 === updateResult.rowCount) {
        throw new Error(
          "E2EE entry to be rekeyed missing.  Incorrect password or race?"
        );
      }
      await txClient.query("UPDATE users SET salt = $2 WHERE uuid = $1", [
        uuid,
        newSalt
      ]);
      return updateResult.rows[0].revision;
    }
  );
}

/**
 * Fetches the amount of end to end encrypted storage saved in this database.
 */
export async function fetchE2EEStorageCount(dbPool: Pool): Promise<number> {
  const result = await sqlQuery(dbPool, `select count(*) as count from e2ee`);
  return parseInt(result.rows[0].count, 10);
}
