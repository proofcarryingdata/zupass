import { Pool } from "postgres-pool";
import { logger } from "../../util/logger";

export async function checkInOfflineTickets(
  dbPool: Pool,
  checkerCommitment: string,
  checkedOfflineInDevconnectTicketIDs: string[]
): Promise<void> {
  logger(dbPool, checkerCommitment, checkedOfflineInDevconnectTicketIDs);
}
