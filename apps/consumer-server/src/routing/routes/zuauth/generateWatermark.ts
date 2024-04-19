import { getRandomValues, hexToBigInt, toHexString } from "@pcd/util";
import express, { Request, Response } from "express";
import { getIronSession } from "iron-session";
import { ApplicationContext } from "../../../types";
import { SessionData } from "../../types";

/**
 * ZK proofs can include a "watermark" value, which can be used to ensure that
 * a proof was created for a specific purpose. In our case, we're generating a
 * random value tied to the user's session, and will only accept proofs that
 * include that value as the watermark. This endpoint generates the random
 * value and returns it.
 */
export function generateWatermark(
  app: express.Application,
  { ironOptions }: ApplicationContext
): void {
  app.get("/auth/watermark", async (req: Request, res: Response) => {
    try {
      const session = await getIronSession<SessionData>(req, res, ironOptions);
      session.watermark = hexToBigInt(
        toHexString(getRandomValues(30))
      ).toString();

      await session.save();

      res.status(200).send(session.watermark);
    } catch (error) {
      console.error(`[ERROR] ${error}`);

      res.send(500);
    }
  });
}
