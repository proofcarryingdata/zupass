import { Pool } from "postgres-pool";
import { sqlQuery } from "../sqlQuery";

export async function getNewPoapUrl(
  client: Pool,
  poapEvent: string
): Promise<string | null> {
  const result = await sqlQuery(
    client,
    `\
SELECT 
  claim_url 
FROM 
  poap_claim_links 
WHERE 
  poap_event = $1 
  AND hashed_ticket_id IS NULL 
LIMIT 1`,
    [poapEvent]
  );
  return result.rowCount > 0 ? result.rows[0].claim_url : null;
}

export async function claimPoapLink(
  client: Pool,
  claimUrl: string,
  hashedTicketId: string
): Promise<number> {
  const result = await sqlQuery(
    client,
    `\
UPDATE
  poap_claim_links
SET
  hashed_ticket_id = $2
WHERE
  claim_url = $1`,
    [claimUrl, hashedTicketId]
  );

  return result.rowCount;
}

export async function getExistingClaimUrlByTicketId(
  client: Pool,
  hashedTicketId: string
): Promise<string | null> {
  const result = await sqlQuery(
    client,
    `\
SELECT
  claim_url
FROM
  poap_claim_links
WHERE
  hashed_ticket_id = $1`,
    [hashedTicketId]
  );
  return result.rowCount > 0 ? result.rows[0].claim_url : null;
}
