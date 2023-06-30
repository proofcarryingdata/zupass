import express, { Request, Response } from "express";
import { ApplicationContext, GlobalServices } from "../../types";
import { logger } from "../../util/logger";
import { decodeString, normalizeEmail } from "../../util/util";

/**
 * These routes are used by the passport client to login a new Zuzalu user.
 */
export function initZuzaluRoutes(
  app: express.Application,
  _context: ApplicationContext,
  { userService, rollbarService }: GlobalServices
): void {
  logger("[INIT] initializing zuzalu routes");

  // Check that email is on the list. Send email with the login code, allowing
  // them to create their passport.
  app.post("/zuzalu/send-login-email", async (req: Request, res: Response) => {
    try {
      const email = normalizeEmail(decodeString(req.query.email, "email"));
      const commitment = decodeString(req.query.commitment, "commitment");
      const force = decodeString(req.query.force, "force") === "true";

      await userService.handleSendZuzaluEmail(email, commitment, force, res);
    } catch (e) {
      logger(e);
      rollbarService?.reportError(e);
      res.sendStatus(500);
    }
  });

  // Check the token (sent to user's email), add a new logged in zuzalu user.
  app.get("/zuzalu/new-participant", async (req: Request, res: Response) => {
    try {
      const token = decodeString(req.query.token, "token");
      const email = normalizeEmail(decodeString(req.query.email, "email"));
      const commitment = decodeString(req.query.commitment, "commitment");

      await userService.handleNewZuzaluUser(token, email, commitment, res);
    } catch (e) {
      logger(e);
      rollbarService?.reportError(e);
      res.sendStatus(500);
    }
  });

  // Fetch a specific zuzalu user, given their public semaphore commitment.
  app.get("/zuzalu/participant/:uuid", async (req: Request, res: Response) => {
    try {
      const uuid = req.params.uuid;
      await userService.handleGetZuzaluUser(uuid, res);
    } catch (e) {
      logger(e);
      rollbarService?.reportError(e);
      res.sendStatus(500);
    }
  });
}
