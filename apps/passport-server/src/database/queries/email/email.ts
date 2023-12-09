import { Pool } from "postgres-pool";
import { EmailTaskDefinition } from "../../../services/bulkEmailService/emailTask";
import { EmailTaskEntry } from "../../models";
import { sqlQuery } from "../../sqlQuery";

export async function upsertEmailTaskEntry(
  db: Pool,
  task: EmailTaskDefinition
): Promise<void> {
  await sqlQuery(db, ``);
}

export async function getEmailTaskEntry(
  db: Pool,
  taskName: string
): Promise<EmailTaskEntry> {
  const result = await sqlQuery(db, ``);
  return result.rows[0];
}
