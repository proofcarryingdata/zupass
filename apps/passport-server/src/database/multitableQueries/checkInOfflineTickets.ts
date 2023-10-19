import { OfflineTickets } from "@pcd/passport-interface";
import { Pool } from "postgres-pool";
import { logger } from "../../util/logger";

export async function checkInOfflineTickets(
  dbPool: Pool,
  checkerCommitment: string,
  offlineTickets: OfflineTickets
): Promise<void> {
  logger(dbPool, checkerCommitment, offlineTickets);
}
