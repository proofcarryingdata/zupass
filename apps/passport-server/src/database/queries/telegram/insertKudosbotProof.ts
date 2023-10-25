import { Pool } from "postgres-pool";
import { sqlQuery } from "../../sqlQuery";

/**
 * Insert a Kudosbot proof into the kudosbot_uploaded_proofs table.
 */
export async function insertKudosbotProof(
  client: Pool,
  proof: string
): Promise<number> {
  const result = await sqlQuery(
    client,
    `\
    insert into kudosbot_uploaded_proofs (proof)
    values ($1);
    `,
    [proof]
  );
  return result.rowCount;
}
