import express, { Request, Response } from "express";
import { ApplicationContext, GlobalServices } from "../../types";
import { logger } from "../../util/logger";
import { decodeString, normalizeEmail } from "../../util/util";

export function initPCDpassRoutes(
  app: express.Application,
  _context: ApplicationContext,
  { userService, rollbarService }: GlobalServices
): void {
  logger("[INIT] initializing PCDpass routes");

  app.get("/pcdpass/", (req: Request, res: Response) => {
    res.sendStatus(200);
  });

  // Check that email is on the list. Send email with the login code, allowing
  // them to create their passport.
  app.post("/pcdpass/send-login-email", async (req: Request, res: Response) => {
    try {
      const email = normalizeEmail(decodeString(req.query.email, "email"));
      const commitment = decodeString(req.query.commitment, "commitment");
      const force = decodeString(req.query.force, "force") === "true";
      await userService.handleSendPCDpassEmail(email, commitment, force, res);
    } catch (e) {
      rollbarService?.reportError(e);
      logger(e);
      res.sendStatus(500);
    }
  });

  // Check the token (sent to user's email), add a new user.
  app.get("/pcdpass/new-participant", async (req: Request, res: Response) => {
    try {
      const token = decodeString(req.query.token, "token");
      const email = normalizeEmail(decodeString(req.query.email, "email"));
      const commitment = decodeString(req.query.commitment, "commitment");
      await userService.handleNewPCDpassUser(token, email, commitment, res);
    } catch (e) {
      rollbarService?.reportError(e);
      logger(e);
      res.sendStatus(500);
    }
  });

  app.post("/pcdpass/device-login", async (req: Request, res: Response) => {
    try {
      const secret = decodeString(req.query.secret, "secret");
      const email = normalizeEmail(decodeString(req.query.email, "email"));
      const commitment = decodeString(req.query.commitment, "commitment");
      await userService.handleNewDeviceLogin(secret, email, commitment, res);
    } catch (e) {
      rollbarService?.reportError(e);
      logger(e);
      res.sendStatus(500);
    }
  });

  // Fetch a specific user, given their public semaphore commitment.
  app.get("/pcdpass/participant/:uuid", async (req: Request, res: Response) => {
    try {
      const uuid = req.params.uuid;
      await userService.handleGetPCDpassUser(uuid, res);
    } catch (e) {
      rollbarService?.reportError(e);
      logger(e);
      res.sendStatus(500);
    }
  });
}
