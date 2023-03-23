import {
  LoadE2EERequest,
  LoadE2EEResponse,
  SaveE2EERequest,
  ZuParticipant,
} from "@pcd/passport-interface";
import { serializeSemaphoreGroup } from "@pcd/semaphore-group-pcd";
import express, { NextFunction, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import {
  getEncryptedStorage,
  setEncryptedStorage,
} from "../../database/queries/e2ee";
import { fetchPretixParticipant } from "../../database/queries/fetchParticipant";
import { tryInsertCommitment } from "../../database/queries/insertCommitment";
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

  // Register a new user, send them an email with a magic link.
  app.post("/zuzalu/register", async (req: Request, res: Response) => {
    const email = decodeString(req.query.email, "email");
    const commitment = decodeString(req.query.commitment, "commitment");

    // Generate a 6-digit random token.
    const token = (((1 + Math.random()) * 1e6) | 0).toString().substring(1);
    if (token.length !== 6) throw new Error("Unreachable");

    // Save the token. This lets the user prove access to their email later.
    const participant = await setParticipantToken(dbClient, { email, token });
    if (participant == null) {
      throw new Error(`${email} doesn't have a ticket.`);
    } else if (
      participant.commitment != null &&
      participant.commitment !== commitment
    ) {
      throw new Error(
        `${email} already registered. You can sync from your existing device.`
      );
    }

    // Send an email with the login token.
    const { name } = participant;
    console.log(`Sending magic link to ${email} ${name}: ${token}`);
    await sendEmail(email, name, token);

    res.sendStatus(200);
  });

  // Handle the email magic link, add a new participant.
  app.get(
    "/zuzalu/new-participant",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const token = decodeString(req.query.token, "token");
        const email = decodeString(req.query.email, "email");
        const commitment = decodeString(req.query.commitment, "commitment");

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
        const uuid = uuidv4();
        console.log(`Saving new commitment: ${uuid}`);
        await tryInsertCommitment(dbClient, {
          uuid,
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
        console.log(`Added new Zuzalu participant: ${jsonP}`);

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
    console.log(`Fetching participant ${uuid}`);
    const participant = semaphoreService.getParticipant(uuid);
    if (!participant) res.status(404);
    res.json(participant || null);
  });

  // Fetch a semaphore group.
  app.get("/semaphore/:id", async (req: Request, res: Response) => {
    const semaphoreId = decodeString(req.params.id, "id");
    if (semaphoreId !== "1") {
      res.sendStatus(404);
      res.json(`Missing semaphore group ${semaphoreId}`);
      return;
    }

    // TODO: support visitor groups
    const group = semaphoreService.groupResi;
    const name = "Zuzalu Residents";

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.json(serializeSemaphoreGroup(group, name));
  });

  // Load E2EE storage for a given user.
  app.post(
    "/sync/load/",
    async (req: Request, res: Response, next: NextFunction) => {
      const request = req.body as LoadE2EERequest;

      if (request.blobKey === undefined) {
        throw new Error("can't load e2ee: missing blobKey");
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
