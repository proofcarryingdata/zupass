import { Client } from "pg";
import { Repository } from "./types";

export async function getRepositories(client: Client): Promise<Repository[]> {
  const results = await client.query(`select * from REPOSITORIES;`);

  return results.rows.map((r) => ({
    repoUrl: r[0],
  }));
}
