import express, { Request, Response } from "express";
import { ApplicationContext, GlobalServices } from "../../types";
import { logger } from "../../util/logger";
import { checkQueryParam } from "../params";
import { PCDHTTPError } from "../pcdHttpError";

export function initPoapRoutes(
  app: express.Application,
  _context: ApplicationContext,
  { poapService }: GlobalServices
): void {
  logger("[INIT] initializing poap routes");

  app.get("/poap/devconnect/callback", async (req: Request, res: Response) => {
    const proof = checkQueryParam(req, "proof");
    if (!proof || typeof proof !== "string") {
      throw new PCDHTTPError(
        400,
        "proof field needs to be a string and be non-empty"
      );
    }

    res.redirect(await poapService.getDevconnectPoapRedirectUrl(proof));
  });

  app.get("/poap/zuzalu23/callback", async (req: Request, res: Response) => {
    const proof = checkQueryParam(req, "proof");
    if (!proof || typeof proof !== "string") {
      throw new PCDHTTPError(
        400,
        "proof field needs to be a string and be non-empty"
      );
    }

    res.redirect(await poapService.getZuzalu23PoapRedirectUrl(proof));
  });

  app.get("/poap/zuconnect/callback", async (req: Request, res: Response) => {
    const proof = checkQueryParam(req, "proof");
    if (!proof || typeof proof !== "string") {
      throw new PCDHTTPError(
        400,
        "proof field needs to be a string and be non-empty"
      );
    }

    res.redirect(await poapService.getZuConnectPoapRedirectUrl(proof));
  });

  app.get("/poap/vitalia/callback", async (req: Request, res: Response) => {
    const proof = checkQueryParam(req, "proof");
    if (!proof || typeof proof !== "string") {
      throw new PCDHTTPError(
        400,
        "proof field needs to be a string and be non-empty"
      );
    }

    res.redirect(await poapService.getVitaliaPoapRedirectUrl(proof));
  });
}
