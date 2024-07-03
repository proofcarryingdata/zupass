import { QueryResult } from "pg";
import { Pool, PoolClient } from "postgres-pool";
import { EncryptedStorageModel } from "../models";
import { sqlQuery, sqlTransaction } from "../sqlQuery";

export type UpdateEncryptedStorageStatus = "updated" | "missing" | "conflict";
export type UpdateEncryptedStorageResult =
  | {
      status: "updated";
      revision: string;
    }
  | {
      status: "missing";
      revision: undefined;
    }
  | {
      status: "conflict";
      revision: string;
    };

/**
 * Returns the encrypted data stored with a given key.
 */
export async function fetchEncryptedStorage(
  dbPool: Pool,
  blobKey: string
): Promise<EncryptedStorageModel | undefined> {
  const results = await sqlQuery(
    dbPool,
    `SELECT * FROM e2ee WHERE blob_key = $1`,
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
export async function setEncryptedStorage(
  dbPool: Pool,
  blobKey: string,
  encryptedBlob: string,
  commitment?: string
): Promise<string> {
  const result = await sqlQuery(
    dbPool,
    `INSERT INTO e2ee(blob_key, encrypted_blob, commitment)
    VALUES ($1, $2, $3)
    ON CONFLICT(blob_key) DO UPDATE
    SET encrypted_blob = $2, revision = e2ee.revision + 1, commitment = $3
    RETURNING revision`,
    [blobKey, encryptedBlob, commitment ?? null]
  );
  return result.rows[0].revision;
}

async function checkAfterUnmatchedUpdate(
  dbPool: Pool,
  blobKey: string
): Promise<UpdateEncryptedStorageResult> {
  // Update didn't match, but we need to fetch to distinguish the two possible
  // cases.  No transactionality needed.  If the row is present at all, we
  // signal a conflict with the latest revision.
  const latestStorage = await fetchEncryptedStorage(dbPool, blobKey);
  if (!latestStorage) {
    return { status: "missing", revision: undefined };
  } else {
    return { status: "conflict", revision: latestStorage.revision };
  }
}

/**
 * Updates the encrypted data stored at a particular encryption key and
 * revision. If knownRevision matches the current revision, the row is
 * updated, and the new revision is returned.  If the knownRevision doesn't
 * match (including if there is no such row), no changes are made
 */
export async function updateEncryptedStorage(
  dbPool: Pool,
  blobKey: string,
  encryptedBlob: string,
  knownRevision: string,
  commitment?: string
): Promise<UpdateEncryptedStorageResult> {
  // This single-step update is safe even without a transaction.  If two matching
  // updates to the same revision race with each other, the implicit row lock
  // inside of the UPDATE will cause one of them to succeed, and the other
  // to no longer match and return 0 rows.
  // See https://www.postgresql.org/docs/9.3/transaction-iso.html
  const updateResult = await sqlQuery(
    dbPool,
    `UPDATE e2ee
    SET encrypted_blob = $2, revision = revision + 1, commitment = $4, time_updated = now()
    WHERE blob_key = $1 AND revision = $3
    RETURNING revision`,
    [blobKey, encryptedBlob, knownRevision, commitment ?? null]
  );

  // Update didn't match, but we need to distinguish the two possible cases.
  if (0 === updateResult.rowCount) {
    return checkAfterUnmatchedUpdate(dbPool, blobKey);
  }

  return { status: "updated", revision: updateResult.rows[0].revision };
}

/**
 * Transactionally performs the changes required to change a user's password
 * (key) for E2EE storage.  Deletes row at at the old blob key, upserts the
 * encrypted data stored at the new blob key, removes the server-saved
 * encryption key if it exists and then updates the user's salt.
 * If knownRevision is given, the operation will fail with a conflict if it
 * doesn't match the latest revision.
 */
export async function rekeyEncryptedStorage(
  dbPool: Pool,
  oldBlobKey: string,
  newBlobKey: string,
  uuid: string,
  newSalt: string,
  encryptedBlob: string,
  knownRevision?: string,
  commitment?: string
): Promise<UpdateEncryptedStorageResult> {
  const newRevision = await sqlTransaction<string | undefined>(
    dbPool,
    "rekey encrypted storage",
    async (txClient: PoolClient) => {
      let updateResult: QueryResult;
      if (knownRevision) {
        // This single-step update is safe even without a transaction.  If two
        // matching updates to the same revision race with each other, the
        // implicit row lock inside of the UPDATE will cause one of them to
        // succeed, and the other to no longer match and return 0 rows.
        // See https://www.postgresql.org/docs/9.3/transaction-iso.html
        updateResult = await txClient.query(
          `UPDATE e2ee
          SET blob_key = $2, encrypted_blob = $3, revision = revision + 1, time_updated = now(), commitment = $5
          WHERE blob_key = $1 AND revision = $4
          RETURNING revision`,
          [
            oldBlobKey,
            newBlobKey,
            encryptedBlob,
            knownRevision,
            commitment ?? null
          ]
        );
      } else {
        updateResult = await txClient.query(
          `UPDATE e2ee
          SET blob_key = $2, encrypted_blob = $3, revision = revision + 1, time_updated = now(), commitment = $4
          WHERE blob_key = $1
          RETURNING revision`,
          [oldBlobKey, newBlobKey, encryptedBlob, commitment ?? null]
        );
      }

      // Update didn't match so we're not making any modifications.  We'll
      // distinguish the sub-cases after rolling back.
      if (0 === updateResult.rowCount) {
        return undefined;
      }

      // Blob update succeeded.  Update the user's salt within the transaction.
      await txClient.query(
        "UPDATE users SET salt = $2, encryption_key = NULL WHERE uuid = $1",
        [uuid, newSalt]
      );

      return updateResult.rows[0].revision;
    }
  );

  // Update didn't match, but we need to distinguish the two possible cases.
  if (!newRevision) {
    return checkAfterUnmatchedUpdate(dbPool, oldBlobKey);
  }
  return { status: "updated", revision: newRevision };
}

/**
 * Fetches the amount of end to end encrypted storage saved in this database.
 */
export async function fetchE2EEStorageCount(dbPool: Pool): Promise<number> {
  const result = await sqlQuery(dbPool, `select count(*) as count from e2ee`);
  return parseInt(result.rows[0].count, 10);
}

export async function deleteE2EEByCommitment(
  dbPool: Pool,
  commitment: string
): Promise<void> {
  await sqlQuery(dbPool, `delete from e2ee where commitment = $1`, [
    commitment
  ]);
}
