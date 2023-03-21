import { ApplicationContext } from "../../types";

export async function getEncryptedStorage(
  context: ApplicationContext,
  email: string
) {
  const db = context.dbClient;
  const results = await db.query("select * from e2ee where email = $1", [
    email,
  ]);

  if (!results.rows[0]) {
    throw new Error(
      `could not retrieve end to end encrypted storage for user ${email}`
    );
  }

  return results.rows[0]["encrypted_blob"];
}

export async function setEncryptedStorage(
  context: ApplicationContext,
  email: string,
  encryptedBlob: string
) {
  const db = context.dbClient;
  await db.query("insert into e2ee values ($1, $2) on conflict update", [
    email,
    encryptedBlob,
  ]);
}
