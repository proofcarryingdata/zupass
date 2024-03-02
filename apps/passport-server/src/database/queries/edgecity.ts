import { EdgeCityBalance } from "@pcd/passport-interface";
import { Pool } from "postgres-pool";
import { sqlQuery } from "../sqlQuery";

export async function getBalances(pool: Pool): Promise<EdgeCityBalance[]> {
  const { rows } = await sqlQuery(
    pool,
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

        UNION ALL

        select u.email, s.score as count
        from ecd_frog_scores s
        join users u on u.commitment = s.semaphore_id
      ) AS subquery
      GROUP BY email
    ) AS final_query
    ORDER BY balance DESC, email;
    `
  );

  return rows;
}
