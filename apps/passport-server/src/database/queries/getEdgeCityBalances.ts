import { EdgeCityBalance } from "@pcd/passport-interface";
import { PoolClient } from "postgres-pool";
import { sqlQuery } from "../sqlQuery";

export async function getEdgeCityBalances(
  client: PoolClient
): Promise<EdgeCityBalance[]> {
  const { rows } = await sqlQuery(
    client,
    `
    SELECT '0x' || encode(sha256('edgecity' || email::bytea), 'hex') as email_hash, balance, RANK() OVER (ORDER BY balance DESC) AS rank
    FROM (
      SELECT email, SUM(count) AS balance
      FROM (
        SELECT receiver_email AS email, COUNT(*) * 10 AS count
        FROM podbox_given_badges
        GROUP BY receiver_email
        
        UNION ALL
        
        SELECT collector_email AS email, COUNT(*) * 10 AS count
        FROM podbox_collected_contacts
        GROUP BY collector_email
      ) AS subquery
      GROUP BY email
    ) AS final_query
    ORDER BY balance DESC, email;
    `
  );

  return rows;
}
