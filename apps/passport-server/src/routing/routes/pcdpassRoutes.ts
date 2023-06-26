import express, { NextFunction, Request, Response } from "express";
import { PoolClient } from "pg";
import { fetchCommitment } from "../../database/queries/fetchCommitment";
import { fetchEmailToken } from "../../database/queries/fetchEmailToken";
import { saveCommitment } from "../../database/queries/saveCommitment";
import { setEmailToken } from "../../database/queries/setEmailToken";
import { semaphoreService } from "../../services/semaphore";
import { ApplicationContext } from "../../types";
import { sendPCDPassEmail } from "../../util/email";
import {
  decodeString,
  generateEmailToken,
  normalizeEmail,
} from "../../util/util";

export function initPCDPassRoutes(
  app: express.Application,
  context: ApplicationContext
) {
  console.log("[INIT] Initializing PCDPass routes");

  app.get("/pcdpass/", (req: Request, res: Response) => {
    res.send("ok");
  });

  const { dbPool } = context;

  // Check that email is on the list. Send email with the login code, allowing
  // them to create their passport.
  app.post("/pcdpass/send-login-email", async (req: Request, res: Response) => {
    const email = normalizeEmail(decodeString(req.query.email, "email"));
    const commitment = decodeString(req.query.commitment, "commitment");
    const force = decodeString(req.query.force, "force") === "true";

    console.log(
      `[ZUID] send-login-email ${JSON.stringify({ email, commitment, force })}`
    );

    const devBypassEmail =
      process.env.BYPASS_EMAIL_REGISTRATION === "true" &&
      process.env.NODE_ENV !== "production";

    const token = generateEmailToken();
    // Save the token. This lets the user prove access to their email later.
    await setEmailToken(dbPool, { email, token });
    const existingCommitment = await fetchCommitment(dbPool, email);

    if (existingCommitment != null && !force) {
      throw new Error(`${email} already registered.`);
    }

    console.log(
      `Saved login token for ${
        existingCommitment === null ? "NEW" : "EXISTING"
      } email=${email} commitment=${commitment}`
    );

    // Send an email with the login token.
    if (devBypassEmail) {
      console.log("[DEV] Bypassing email, returning token");
      res.json({ token });
    } else {
      console.log(`[ZUID] Sending token=${token} to email=${email}`);
      await sendPCDPassEmail(context, email, token);
      res.sendStatus(200);
    }
  });

  // Check the token (sent to user's email), add a new participant.
  app.get(
    "/pcdpass/new-participant",
    async (req: Request, res: Response, next: NextFunction) => {
      let dbClient = undefined as PoolClient | undefined;
      try {
        const token = decodeString(req.query.token, "token");
        const email = normalizeEmail(decodeString(req.query.email, "email"));
        const commitment = decodeString(req.query.commitment, "commitment");
        console.log(
          `[ZUID] new-participant ${JSON.stringify({
            token,
            email,
            commitment,
          })}`
        );

        dbClient = await dbPool.connect();
        const savedToken = await fetchEmailToken(dbClient, email);
        if (savedToken !== token) {
          throw new Error(
            `Wrong token. If you got more than one email, use the latest one.`
          );
        }

        // Save commitment to DB.
        console.log(`[ZUID] Saving new commitment: ${commitment}`);
        await saveCommitment(dbClient, { email, commitment });

        // Reload Merkle trees
        await semaphoreService.reload();

        // Return participant, including UUID, back to Passport
        const zuParticipant = await fetchCommitment(dbClient, email);
        const jsonP = JSON.stringify(zuParticipant);
        console.log(`[ZUID] Added new Zuzalu participant: ${jsonP}`);

        res.json(zuParticipant);
      } catch (e: any) {
        e.message = "Can't add Zuzalu Passport: " + e.message;
        next(e);
      } finally {
        if (dbClient != null) dbClient.release();
      }
    }
  );

  // Fetch a specific participant, given their public semaphore commitment.
  app.get("/pcdpass/participant/:uuid", async (req: Request, res: Response) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    const uuid = req.params.uuid;
    console.log(`[ZUID] Fetching participant ${uuid}`);
    const participant = semaphoreService.getParticipant(uuid);
    if (!participant) res.status(404);
    res.json(participant || null);
  });
}
