import { ApplicationContext, GlobalServices } from "../../types";
import { logger } from "../../util/logger";

export function initGenericIssuanceRoutes(
  app: express.Application,
  _context: ApplicationContext,
  { genericIssuanceService }: GlobalServices
): void {
  logger("[INIT] initializing generic issuance routes");
}
