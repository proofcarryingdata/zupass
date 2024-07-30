import { Pool } from "postgres-pool";

/**
 * Attempts to check in the given devconnect tickets on behalf of the user
 * with the given commitment. Does not error in cases where the user does not
 * have permission, or the ticket does not exist, etc., in order to be robust
 * to ticketing settings having changed since the user was last online.
 */
export async function checkInOfflineTickets(
  _dbPool: Pool,
  _checkerCommitment: string,
  _checkedOfflineInDevconnectTicketIDs: string[]
): Promise<void> {}
