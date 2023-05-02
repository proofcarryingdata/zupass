import { ClientBase, Pool } from "pg";
import { query } from "../query";

export async function writeUser(
  client: ClientBase | Pool,
  params: {
    new_encrypted_blob: string;
    searched_identifier: string;
    claimed_server_password: string;
  }
): Promise<number> {
  const result = await query(
    client,
    `\
update users
set encrypted_blob = $1, updated_at = NOW()
where identifier = $2 AND server_password = $3;
`,
    [
      params.new_encrypted_blob,
      params.searched_identifier,
      params.claimed_server_password,
    ]
  );
  return result.rowCount;
}
