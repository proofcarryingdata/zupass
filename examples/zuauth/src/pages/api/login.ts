import { SessionData, ironOptions } from "@/config/iron";
import { eventTicketMetadata } from "@/metadata";
import { authenticate } from "@pcd/zuauth/server";
import { getIronSession } from "iron-session";
import { NextApiRequest, NextApiResponse } from "next";

/**
 * The login checks the validity of the PCD and ensures that the ticket
 * has been issued by Zupass. The watermark used to create the PCD must equal
 * the watermark of the current session.
 * The PCD nullifier is saved to prevent the same PCD from being used for another login.
 */
export default async function Login(req: NextApiRequest, res: NextApiResponse) {
  const session = await getIronSession<SessionData>(req, res, ironOptions);
  try {
    if (!req.body.pcd) {
      console.error(`[ERROR] No PCD specified`);

      res.status(400).send("No PCD specified");
      return;
    }

    const pcd = await authenticate(
      req.body.pcd,
      session.watermark ?? "",
      eventTicketMetadata
    );

    session.user = pcd.claim.partialTicket;

    await session.save();

    res
      .status(200)
      .send({ user: session.user, nullifier: pcd.claim.nullifierHash });
  } catch (error: any) {
    console.error(`[ERROR] ${error}`);

    res.status(500).send(`Unknown error: ${error.message}`);
  }
}
