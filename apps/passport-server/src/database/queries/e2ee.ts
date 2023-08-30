import { Pool } from "postgres-pool";
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
 * Replaces the encrypted data stored at a particular Master Password.
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
 * Fetches the amount of end to end encrypted storage saved in this database.
 */
export async function fetchE2EEStorageCount(dbPool: Pool): Promise<number> {
  const result = await sqlQuery(dbPool, `select count(*) as count from e2ee`);
  return parseInt(result.rows[0].count, 10);
}
