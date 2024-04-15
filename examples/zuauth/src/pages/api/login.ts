import { SessionData, ironOptions } from "@/config/iron";
import { eventTicketMetadata } from "@/metadata";
import { authenticate } from "@pcd/zuauth/server";
import { getIronSession } from "iron-session";
import { NextApiRequest, NextApiResponse } from "next";

/**
 * Once the front-end has received a PCD from the popup window, it sends it to
 * the back-end for verification.
 *
 * Calling {@link authenticate} will check that the PCD is cryptographically
 * valid, has the correct watermark, and that its contents match the expected
 * event metadata (public key, event ID, product ID).
 */
export default async function Login(req: NextApiRequest, res: NextApiResponse) {
  if (!req.body.pcd) {
    console.error(`[ERROR] No PCD specified`);
    res.status(400).send("No PCD specified");
    return;
  }

  try {
    const session = await getIronSession<SessionData>(req, res, ironOptions);
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
  } catch (e) {
    console.error(`[ERROR] ${e}`);
    res
      .status(400)
      .send(e instanceof Error ? e.message : "An unexpected error occurred");
  }
}
