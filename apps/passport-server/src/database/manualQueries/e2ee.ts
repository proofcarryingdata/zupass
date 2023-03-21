import { ApplicationContext } from "../../types";

export interface EncryptedStorageModel {
  email: string;
  encrypted_blob: string;
  token: string;
}

export async function getEncryptedStorage(
  context: ApplicationContext,
  email: string
): Promise<EncryptedStorageModel | undefined> {
  const db = context.dbClient;
  const results = await db.query("select * from e2ee where email = $1;", [
    email,
  ]);

  if (!results.rows[0]) {
    return undefined;
  }

  return results.rows[0] as EncryptedStorageModel;
}

export async function setEncryptedStorage(
  context: ApplicationContext,
  email: string,
  token: string,
  encryptedBlob: string
) {
  const db = context.dbClient;
  await db.query(
    "insert into e2ee(email, token, encrypted_blob) values " +
      "($1, $2, $3) on conflict(email) do update set email = $1, encrypted_blob = $2",
    [email, token, encryptedBlob]
  );
}
