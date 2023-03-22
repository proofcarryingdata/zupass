import { ClientBase, Pool } from "pg";

// Saves a new commitment. Can only happen once per email address.
// Returns the full participant record, including Pretix info & commitment.
export async function tryInsertCommitment(
  client: ClientBase | Pool,
  params: {
    uuid: string;
    email: string;
    commitment: string;
  }
): Promise<void> {
  const { uuid, email, commitment } = params;

  // Insert succeeds only if we already have a Pretix participant (but don't
  // already have a commitment) for this email--due to foreign + unique keys.
  const result = await client.query(
    `\
INSERT INTO commitments (uuid, participant_email, commitment)
VALUES ($1, $2, $3)
ON CONFLICT (commitment) DO UPDATE SET uuid = $1`,
    [uuid, email, commitment]
  );
  console.log(`Tried commitment insert. UUID ${uuid}, n ${result.rowCount}`);
}
