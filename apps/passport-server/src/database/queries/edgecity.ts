import { EdgeCityBalance } from "@pcd/passport-interface";
import { Pool } from "postgres-pool";
import { sqlQuery } from "../sqlQuery";

export async function getBalances(pool: Pool): Promise<EdgeCityBalance[]> {
  const { rows } = await sqlQuery(
    pool,
    `
    SELECT '0x' || encode(sha256('edgecity' || email::bytea), 'hex') as email_hash, balance::int, RANK() OVER (ORDER BY balance DESC) AS rank
    FROM (
      SELECT email, SUM(count) AS balance
      FROM (
        SELECT receiver_email AS email, COUNT(*) AS count
        FROM podbox_given_badges
        GROUP BY receiver_email
        
        UNION ALL
        
        SELECT collector_email AS email, COUNT(*) AS count
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

export async function getUserBalance(
  pool: Pool,
  email: string
): Promise<EdgeCityBalance | null> {
  const { rows } = await sqlQuery(
    pool,
    `
SELECT '0x' || encode(sha256('edgecity' || $1::bytea), 'hex') as email_hash, SUM(count) AS balance
FROM (
  SELECT COUNT(*) AS count
  FROM podbox_given_badges
  WHERE receiver_email = $1

  UNION ALL

  SELECT COUNT(*) AS count
  FROM podbox_collected_contacts
  WHERE collector_email = $1
) AS subquery;`,
    [email]
  );
  return rows.length ? rows[0] : null;
}
