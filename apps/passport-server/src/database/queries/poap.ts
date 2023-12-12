import { Pool } from "postgres-pool";
import { sqlQuery } from "../sqlQuery";

/**
 * Fetches an unclaimed POAP for a given event and returns its URL if it exists;
 * otherwise, returns NULL if there are no more unclaimed POAPs available for the
 * given event.
 *
 * If there is a new unclaimed POAP, we associates the provided hashed ticket ID
 * with a POAP claim URL such that in the future, that hashed ticket ID will be
 * redirected to this POAP claim URL.
 */
export async function claimNewPoapUrl(
  client: Pool,
  poapEvent: string,
  hashedTicketId: string
): Promise<string | null> {
  const result = await sqlQuery(
    client,
    `\
UPDATE poap_claim_links
SET hashed_ticket_id = $2
WHERE claim_url =
    (SELECT claim_url
      FROM poap_claim_links
      WHERE poap_event = $1
        AND hashed_ticket_id IS NULL
      LIMIT 1) RETURNING claim_url`,
    [poapEvent, hashedTicketId]
  );
  return result.rowCount > 0 ? result.rows[0].claim_url : null;
}

/**
 * Returns the POAP claim URL associated with this hashed ticket ID
 * if it exists; otherwise, return NULL.
 */
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
