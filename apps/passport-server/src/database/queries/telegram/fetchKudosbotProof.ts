import { Pool } from "postgres-pool";
import { sqlQuery } from "../../sqlQuery";

/**
 * Fetch all Kudosbot proofs from the kudosbot_uploaded_proofs table.
 */
export async function fetchKudosbotProofs(client: Pool): Promise<string[]> {
  const result = await sqlQuery(
    client,
    `\
    select * from kudosbot_uploaded_proofs
    `,
    []
  );
  return result.rows.map((row) => row.proof);
}
