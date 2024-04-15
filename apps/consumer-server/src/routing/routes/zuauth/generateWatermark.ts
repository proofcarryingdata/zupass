import { getRandomValues, hexToBigInt, toHexString } from "@pcd/util";
import express, { Request, Response } from "express";
import { getIronSession } from "iron-session";
import { ApplicationContext } from "../../../types";
import { SessionData } from "../../types";

/**
 * The watermark is used in the ZK ticket authentication mechanism.
 * This API allows you to generate a random value and save it in the current
 * session. The same value will be used by the user for generating the ZK proof
 * of ticket-holding on the client side and must correspond to the one stored
 * in the session in the subsequent API call for the login process.
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
