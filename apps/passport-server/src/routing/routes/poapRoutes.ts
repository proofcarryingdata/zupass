import express, { Request, Response } from "express";
import { namedSqlTransaction } from "../../database/sqlQuery";
import { ApplicationContext, GlobalServices } from "../../types";
import { logger } from "../../util/logger";
import { checkQueryParam } from "../params";
import { PCDHTTPError } from "../pcdHttpError";

export function initPoapRoutes(
  app: express.Application,
  context: ApplicationContext,
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

    await namedSqlTransaction(
      context.dbPool,
      "/poap/devconnect/callback",
      async (client) => {
        res.redirect(
          await poapService.getDevconnectPoapRedirectUrl(client, proof)
        );
      }
    );
  });

  app.get("/poap/zuzalu23/callback", async (req: Request, res: Response) => {
    const proof = checkQueryParam(req, "proof");
    if (!proof || typeof proof !== "string") {
      throw new PCDHTTPError(
        400,
        "proof field needs to be a string and be non-empty"
      );
    }

    await namedSqlTransaction(
      context.dbPool,
      "/poap/zuzalu23/callback",
      async (client) => {
        res.redirect(
          await poapService.getZuzalu23PoapRedirectUrl(client, proof)
        );
      }
    );
  });

  app.get("/poap/zuconnect/callback", async (req: Request, res: Response) => {
    const proof = checkQueryParam(req, "proof");
    if (!proof || typeof proof !== "string") {
      throw new PCDHTTPError(
        400,
        "proof field needs to be a string and be non-empty"
      );
    }

    await namedSqlTransaction(
      context.dbPool,
      "/poap/devconnect/callback",
      async (client) => {
        res.redirect(
          await poapService.getZuConnectPoapRedirectUrl(client, proof)
        );
      }
    );
  });

  app.get("/poap/vitalia/callback", async (req: Request, res: Response) => {
    const proof = checkQueryParam(req, "proof");
    if (!proof || typeof proof !== "string") {
      throw new PCDHTTPError(
        400,
        "proof field needs to be a string and be non-empty"
      );
    }

    await namedSqlTransaction(
      context.dbPool,
      "/poap/vitalia/callback",
      async (client) => {
        res.redirect(
          await poapService.getVitaliaPoapRedirectUrl(client, proof)
        );
      }
    );
  });

  app.get(
    "/poap/edgecitydenver/callback",
    async (req: Request, res: Response) => {
      const proof = checkQueryParam(req, "proof");
      if (!proof || typeof proof !== "string") {
        throw new PCDHTTPError(
          400,
          "proof field needs to be a string and be non-empty"
        );
      }

      await namedSqlTransaction(
        context.dbPool,
        "/poap/edgecitydenver/callback",
        async (client) => {
          res.redirect(
            await poapService.getEdgeCityDenverPoapRedirectUrl(client, proof)
          );
        }
      );
    }
  );

  app.get("/poap/ethlatam/callback", async (req: Request, res: Response) => {
    const proof = checkQueryParam(req, "proof");
    if (!proof || typeof proof !== "string") {
      throw new PCDHTTPError(
        400,
        "proof field needs to be a string and be non-empty"
      );
    }

    await namedSqlTransaction(
      context.dbPool,
      "/poap/ethlatam/callback",
      async (client) => {
        res.redirect(
          await poapService.getETHLatamPoapRedirectUrl(client, proof)
        );
      }
    );
  });
}
