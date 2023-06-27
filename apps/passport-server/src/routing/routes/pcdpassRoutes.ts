import express, { Request, Response } from "express";
import { ApplicationContext, GlobalServices } from "../../types";
import { decodeString, normalizeEmail } from "../../util/util";

export function initPCDPassRoutes(
  app: express.Application,
  _context: ApplicationContext,
  { userService }: GlobalServices
) {
  console.log("[INIT] Initializing PCDPass routes");

  app.get("/pcdpass/", (req: Request, res: Response) => {
    res.send("ok");
  });

  // Check that email is on the list. Send email with the login code, allowing
  // them to create their passport.
  app.post("/pcdpass/send-login-email", async (req: Request, res: Response) => {
    const email = normalizeEmail(decodeString(req.query.email, "email"));
    const commitment = decodeString(req.query.commitment, "commitment");
    const force = decodeString(req.query.force, "force") === "true";

    userService.handleSendPcdPassEmail(email, commitment, force, res);
  });

  // Check the token (sent to user's email), add a new participant.
  app.get("/pcdpass/new-participant", async (req: Request, res: Response) => {
    const token = decodeString(req.query.token, "token");
    const email = normalizeEmail(decodeString(req.query.email, "email"));
    const commitment = decodeString(req.query.commitment, "commitment");

    userService.handleNewPcdPassUser(token, email, commitment, res);
  });

  // Fetch a specific participant, given their public semaphore commitment.
  app.get("/pcdpass/participant/:uuid", async (req: Request, res: Response) => {
    const uuid = req.params.uuid;
    userService.handleGetPcdPassUser(uuid, res);
  });
}
