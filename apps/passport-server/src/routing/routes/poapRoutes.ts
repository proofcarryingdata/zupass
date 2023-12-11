import express, { Request, Response } from "express";
import { ApplicationContext, GlobalServices } from "../../types";
import { logger } from "../../util/logger";
import { checkQueryParam } from "../params";

export function initPoapRoutes(
  app: express.Application,
  _context: ApplicationContext,
  { poapService }: GlobalServices
): void {
  logger("[INIT] initializing poap routes");

  app.get("/poap/devconnect/callback", async (req: Request, res: Response) => {
    const proof = checkQueryParam(req, "proof");
    if (!proof || typeof proof !== "string") {
      throw new Error("proof field needs to be a string and be non-empty");
    }

    if (!poapService) {
      throw new Error("POAP service not initalized");
    }

    res.redirect(await poapService.getDevconnectPoapClaimUrl(proof));
  });
}
