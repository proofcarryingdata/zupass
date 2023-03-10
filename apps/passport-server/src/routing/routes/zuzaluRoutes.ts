import { ZuParticipant } from "@pcd/passport-interface";
import { BackendUser } from "@pcd/pcd-types";
import { serializeSemaphoreGroup } from "@pcd/semaphore-group-pcd";
import { Group } from "@semaphore-protocol/group";
import express, { NextFunction, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { createUser, fetchUser, writeUser } from "../../database/queries";
import { ApplicationContext } from "../../types";
import { sendEmail } from "../../util/email";

// Zuzalu residents group
const globalGroup = new Group("1", 16);

// Zuzalu participants by UUID
const participants = {} as Record<string, ZuParticipant>;
function cleanDBUser(
  user: Awaited<ReturnType<typeof fetchUser>>[0]
): BackendUser {
  return {
    identifier: user.identifier,
    status: user.status,
    createdAt: user.created_at,
    encryptedBlob: user.encrypted_blob,
    updatedAt: user.updated_at,
  };
}

// localhost:3002/zuzalu/new-participant?redirect=https://google.com&commitment=5457595841026900857541504228783465546811548969738060765965868301945253125
// example identity: ["da4e5656b0892923d30c0a8fa9e68a2ea5b8095c09a4198d066219d5b4e30a","651e367c40d65f65f38ba60f723feb2abcafddd1aa24e6de35a0d9189bca58"]
export function initZuzaluRoutes(
  app: express.Application,
  context: ApplicationContext
): void {
  console.log("[INIT] Initializing zuzalu routes");

  // Handle the email magic link, add a new participant.
  app.get(
    "/zuzalu/new-participant",
    async (req: Request, res: Response, next: NextFunction) => {
      const redirect = decodeString(req.query.redirect, "redirect");
      try {
        // TODO: check this magic link was signed by the server
        const token = decodeString(req.query.token, "token");
        // TODO: check this is a valid email
        const email = decodeString(req.query.email, "email");
        const commitment = decodeString(req.query.commitment, "commitment");

        // TODO: look up participant record from Pretix
        const name = "Alice Amber";
        const role = "resident";
        const residence = "Verkle Veranda";

        const bigIntCommitment = BigInt(commitment);
        if (globalGroup.indexOf(bigIntCommitment) >= 0) {
          throw new Error(
            `member ${bigIntCommitment} already in semaphore group`
          );
        }

        globalGroup.addMember(bigIntCommitment);

        // TODO: save commitment, new Merkle root to DB
        const participant: ZuParticipant = {
          uuid: uuidv4(),
          commitment,
          email,
          name,
          role,
          residence,
        };
        const jsonP = JSON.stringify(participant);
        console.log(`Adding new zuzalu participant: ${jsonP}`);
        participants[participant.uuid] = participant;
        console.log(`New group root: ${globalGroup.root}`);

        res.redirect(`${redirect}?success=true&participant=${jsonP}`);
      } catch (e) {
        console.log("error adding new zuzalu participant: ", e);
        res.redirect(redirect + "?success=false");
      }
    }
  );

  // Fetch a specific participant, given their public semaphore commitment.
  app.get("/zuzalu/participant/:uuid", async (req: Request, res: Response) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    const uuid = req.params.uuid;
    console.log(`Fetching participant ${uuid}`);
    const participant = participants[uuid];
    if (!participant) res.status(404);
    res.json(participant || null);
  });

  // Fetch a semaphore group.
  app.get("/semaphore/:id", async (req: Request, res: Response) => {
    // TODO: check this group actually exists
    const semaphoreId = req.params.id;

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.json(serializeSemaphoreGroup(globalGroup, "Zuzalu Residents"));
  });

  app.get("/testEmail", async (req: Request, res: Response) => {
    sendEmail("test@nibnalin.me", "testing123");
  });

  app.post("/user/create", async (req: Request, res: Response) => {
    console.log("req", req.body);
    const { identifier, status, serverPassword, encryptedBlob } = req.body;

    const write = await createUser(context.dbClient, {
      identifier: identifier,
      status: status,
      server_password: serverPassword,
      encrypted_blob: encryptedBlob,
    });

    res.json({ success: write });
  });

  app.get("/user/fetch/", async (req: Request, res: Response) => {
    const identifier = req.query.identifier;

    if (typeof identifier !== "string") {
      throw new Error(
        "missing 'identifier' query string parameter - it should be a string"
      );
    }

    const users = await fetchUser(context.dbClient, {
      searched_identifier: identifier,
    });
    if (users.length != 1) {
      throw new Error("user not found");
    }
    res.json(cleanDBUser(users[0]));
  });

  app.post("/user/write", async (req: Request, res: Response) => {
    const { identifier, serverPassword, encryptedBlob } = req.body;

    const writes = await writeUser(context.dbClient, {
      searched_identifier: identifier,
      claimed_server_password: serverPassword,
      new_encrypted_blob: encryptedBlob,
    });

    res.json({ success: writes });
  });
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
