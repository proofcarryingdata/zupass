import { serializeSemaphoreGroup } from "@pcd/semaphore-group-pcd";
import { Group } from "@semaphore-protocol/group";
import express, { NextFunction, Request, Response } from "express";
import { ApplicationContext } from "../../types";
import { sendEmail } from "../../util/email";

// Zuzalu residents group
const globalGroup = new Group("1", 16);

// localhost:3002/zuzalu/new-participant?redirect=https://google.com&commitment=5457595841026900857541504228783465546811548969738060765965868301945253125
// example identity: ["da4e5656b0892923d30c0a8fa9e68a2ea5b8095c09a4198d066219d5b4e30a","651e367c40d65f65f38ba60f723feb2abcafddd1aa24e6de35a0d9189bca58"]
export function initZuzaluRoutes(
  app: express.Application,
  context: ApplicationContext
): void {
  console.log("[INIT] Initializing health check routes");

  app.get(
    "/zuzalu/new-participant",
    async (req: Request, res: Response, next: NextFunction) => {
      const redirect = decodeURIComponent(req.query.redirect as string);
      // TODO: check this was signed by the server and contains 'email' and 'member' that match the rest of this request
      const token = req.query.token;
      // TODO: check this is a valid email
      const email = req.query.email;
      const commitment = req.query.commitment;

      // TODO: look up participant record
      const name = "Alice Amber";
      const role = "resident";

      try {
        if (typeof redirect !== "string") {
          return next(
            new Error(
              "missing 'redirect' query string parameter - it should be a string"
            )
          );
        }

        if (typeof commitment !== "string") {
          throw new Error(
            "missing 'commitment' query string parameter - it should be a stringified BigInt"
          );
        }

        const bigIntCommitment = BigInt(commitment);

        if (globalGroup.indexOf(bigIntCommitment) >= 0) {
          throw new Error(
            `member ${bigIntCommitment} already in semaphore group`
          );
        }

        globalGroup.addMember(bigIntCommitment);

        // TODO: save commitment, new Merkle root to DB
        const participant = {
          commitment,
          email,
          name,
          role,
        };
        const jsonP = JSON.stringify(participant);
        console.log(`Added new zuzalu participant: ${jsonP}`);
        console.log(`New group root: ${globalGroup.root}`);

        res.redirect(`${redirect}?success=true&participant=${jsonP}`);
      } catch (e) {
        console.log("error adding new zuzalu participant: ", e);
        res.redirect(redirect + "?success=false");
      }
    }
  );

  app.get("/semaphore/:id", async (req: Request, res: Response) => {
    // TODO: check this group actually exists
    const semaphoreId = req.params.id;

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.json(
      JSON.stringify(serializeSemaphoreGroup(globalGroup, "Zuzalu Residents"))
    );
  });

  app.get("/testEmail", async (req: Request, res: Response) => {
    sendEmail("test@nibnalin.me", "testing123");
  });
}
