import {
  DiscordAuthorizeRequest
} from "@pcd/passport-interface";
import express, { Request, Response } from "express";
import { ApplicationContext, GlobalServices } from "../../types";
import { logger } from "../../util/logger";
  
export function initDiscordRoutes(
  app: express.Application,
  _context: ApplicationContext,
  { discordService, rollbarService, verifyService }: GlobalServices
): void {
  logger("[INIT] initializing discord routes");

  app.post("/discord/authorize", async (req: Request, res: Response) => {
    logger("/discord/authorize received:", req.body);
    try {
      const request = req.body as DiscordAuthorizeRequest;

      const verified = await verifyService.verify(request);

      logger(`[VERIFY] result ${verified.verified}`);

      // TODO: get role
      const roleId = "roleId";
      const assigned = await discordService?.assignRole(
        request.discordUserId,
        request.discordGuildId,
        roleId
      );
      res.json({
        assigned: assigned
      });
    } catch (e) {
      logger("/discord/authorize error: ", e);
      rollbarService?.reportError(e);
      res.sendStatus(500);
    }
  });
}

