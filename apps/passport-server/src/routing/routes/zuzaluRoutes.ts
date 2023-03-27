import {
  LoadE2EERequest,
  LoadE2EEResponse,
  SaveE2EERequest,
  ZuParticipant,
} from "@pcd/passport-interface";
import { serializeSemaphoreGroup } from "@pcd/semaphore-group-pcd";
import express, { NextFunction, Request, Response } from "express";
import { ParticipantRole } from "../../database/models";
import {
  getEncryptedStorage,
  setEncryptedStorage,
} from "../../database/queries/e2ee";
import { fetchPretixParticipant } from "../../database/queries/fetchParticipant";
import { findOrCreateCommitment } from "../../database/queries/findOrCreateCommitment";
import { insertParticipant } from "../../database/queries/insertParticipant";
import { setParticipantToken } from "../../database/queries/setParticipantToken";
import { semaphoreService } from "../../services/semaphore";
import { ApplicationContext } from "../../types";
import { sendEmail } from "../../util/email";

// API for Passport setup, Zuzalu IDs, and semaphore groups.
export function initZuzaluRoutes(
  app: express.Application,
  context: ApplicationContext
): void {
  console.log("[INIT] Initializing zuzalu routes");
  const { dbClient } = context;

  // Check that email is on the list. Send email with the login code, allowing
  // them to create their passport.
  app.post("/zuzalu/send-login-email", async (req: Request, res: Response) => {
    const email = decodeString(req.query.email, "email");
    const commitment = decodeString(req.query.commitment, "commitment");
    console.log(
      `[ZUID] Got login email request. email=${email} commitment=${commitment}`
    );

    // Generate a 6-digit random token.
    const token = (((1 + Math.random()) * 1e6) | 0).toString().substring(1);
    if (token.length !== 6) throw new Error("Unreachable");

    // Save the token. This lets the user prove access to their email later.

    if (process.env.BYPASS_EMAIL_REGISTRATION === "true") {
      await insertParticipant(dbClient, {
        email: email,
        email_token: "",
        name: "test testerly",
        order_id: "",
        residence: "atlantis",
        role: ParticipantRole.Resident,
      });
    }

    const participant = await setParticipantToken(dbClient, { email, token });

    if (participant == null) {
      throw new Error(`${email} doesn't have a ticket.`);
    } else if (
      participant.commitment != null &&
      participant.commitment !== commitment
    ) {
      throw new Error(`${email} already registered.`);
    }
    const stat = participant.commitment == null ? "NEW" : "EXISTING";
    console.log(
      `Saved login token for ${stat} email=${email} commitment=${commitment}`
    );

    // Send an email with the login token.

    if (process.env.BYPASS_EMAIL_REGISTRATION) {
      console.log("[DEV] Bypassing email, returning token");
      res.json({ token });
    } else {
      const { name } = participant;
      console.log(
        `[ZUID] Sending token=${token} to email=${email} name=${name}`
      );
      await sendEmail(email, name, token);
    }
  });

  // Check the token (sent to user's email), add a new participant.
  app.get(
    "/zuzalu/new-participant",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const token = decodeString(req.query.token, "token");
        const email = decodeString(req.query.email, "email");
        const commitment = decodeString(req.query.commitment, "commitment");
        console.log(
          `[ZUID] Got new participant request. email=${email} token=${token} commitment=${commitment}`
        );

        // Look up participant record from Pretix
        const pretix = await fetchPretixParticipant(dbClient, { email });
        if (pretix == null) {
          throw new Error(`Ticket for ${email} not found`);
        } else if (pretix.email_token !== token) {
          throw new Error(
            `Wrong token. If you got more than one email, use the latest one.`
          );
        } else if (pretix.email !== email) {
          throw new Error(`Email mismatch.`);
        }

        // Save commitment to DB.
        console.log(`[ZUID] Saving new commitment: ${commitment}`);
        const uuid = await findOrCreateCommitment(dbClient, {
          email,
          commitment,
        });

        // Reload Merkle trees
        await semaphoreService.reload(dbClient);
        const participant = semaphoreService.getParticipant(uuid);
        if (participant == null) {
          throw new Error(`${uuid} not found`);
        } else if (participant.commitment !== commitment) {
          throw new Error(`Commitment mismatch`);
        }

        // Return participant, including UUID, back to Passport
        const zuParticipant = participant as ZuParticipant;
        const jsonP = JSON.stringify(zuParticipant);
        console.log(`[ZUID] Added new Zuzalu participant: ${jsonP}`);

        res.json(zuParticipant);
      } catch (e: any) {
        e.message = "Can't add Zuzalu Passport: " + e.message;
        next(e);
      }
    }
  );

  // Fetch a specific participant, given their public semaphore commitment.
  app.get("/zuzalu/participant/:uuid", async (req: Request, res: Response) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    const uuid = req.params.uuid;
    console.log(`[ZUID] Fetching participant ${uuid}`);
    const participant = semaphoreService.getParticipant(uuid);
    if (!participant) res.status(404);
    res.json(participant || null);
  });

  // Fetch a semaphore group.
  app.get("/semaphore/:id", async (req: Request, res: Response) => {
    const semaphoreId = decodeString(req.params.id, "id");

    const namedGroup = semaphoreService.getNamedGroup(semaphoreId);
    if (namedGroup == null) {
      res.sendStatus(404);
      res.json(`Missing semaphore group ${semaphoreId}`);
      return;
    }

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.json(serializeSemaphoreGroup(namedGroup.group, namedGroup.name));
  });

  // Load E2EE storage for a given user.
  app.post(
    "/sync/load/",
    async (req: Request, res: Response, next: NextFunction) => {
      const request = req.body as LoadE2EERequest;

      if (request.blobKey === undefined) {
        throw new Error("Can't load e2ee: missing blobKey");
      }
      console.log(`[E2EE] Loading ${request.blobKey}`);

      try {
        const storageModel = await getEncryptedStorage(
          context,
          request.blobKey
        );

        if (!storageModel) {
          throw new Error("can't load e2ee: never saved");
        }

        const result: LoadE2EEResponse = {
          encryptedStorage: JSON.parse(storageModel.encrypted_blob),
        };

        res.json(result);
      } catch (e) {
        console.log(e);
        next(e);
      }
    }
  );

  app.post(
    "/sync/save",
    async (req: Request, res: Response, next: NextFunction) => {
      const request = req.body as SaveE2EERequest;
      console.log(`[E2EE] Saving ${request.blobKey}`);

      try {
        await setEncryptedStorage(
          context,
          request.blobKey,
          request.encryptedBlob
        );

        res.send("ok");
      } catch (e) {
        next(e);
      }
    }
  );
}

function decodeString(
  s: any,
  name: string,
  predicate?: (s: String) => boolean
): string {
  if (s == null) {
    throw new Error(`Missing ${name}`);
  }
  if (typeof s !== "string" || (predicate && !predicate(s))) {
    throw new Error(`Invalid ${name}`);
  }
  return decodeURIComponent(s);
}
