import { getRandomValues, hexToBigInt, toHexString } from "@pcd/util";
import express, { Request, Response } from "express";
import { ApplicationContext } from "../../../types";

/**
 * The nonce is a value used in the EdDSA ticket and as a watermark
 * in the ZK ticket authentication mechanism. This API allows you to
 * generate a random value and save it in the current session.
 * The same nonce will be used by the user for generating the PCD ticket
 * on the client side and must correspond to the one stored in
 * the session in the subsequent API call for the login process.
 */
export function generateNonce(
  app: express.Application,
  _context: ApplicationContext
): void {
  app.get("/auth/nonce", async (req: Request, res: Response) => {
    try {
      req.session.nonce = hexToBigInt(
        toHexString(getRandomValues(30))
      ).toString();

      await req.session.save();

      res.status(200).send(req.session.nonce);
    } catch (error) {
      console.error(`[ERROR] ${error}`);

      res.send(500);
    }
  });
}
