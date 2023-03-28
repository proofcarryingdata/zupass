import { ApplicationContext } from "../../types";

export interface EncryptedStorageModel {
  blob_key: string;
  encrypted_blob: string;
}

export async function getEncryptedStorage(
  context: ApplicationContext,
  blobKey: string
): Promise<EncryptedStorageModel | undefined> {
  const results = await context.dbPool.query(
    "select * from e2ee where blob_key = $1;",
    [blobKey]
  );

  if (!results.rows[0]) {
    return undefined;
  }

  return results.rows[0] as EncryptedStorageModel;
}

export async function setEncryptedStorage(
  context: ApplicationContext,
  blobKey: string,
  encryptedBlob: string
) {
  await context.dbPool.query(
    "insert into e2ee(blob_key, encrypted_blob) values " +
      "($1, $2) on conflict(blob_key) do update set encrypted_blob = $2;",
    [blobKey, encryptedBlob]
  );
}
