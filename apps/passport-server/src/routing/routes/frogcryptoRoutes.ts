import {
  FrogCryptoDeleteFrogsRequest,
  FrogCryptoDeleteFrogsResponseValue,
  FrogCryptoShareTelegramHandleRequest,
  FrogCryptoShareTelegramHandleResponseValue,
  FrogCryptoUpdateFeedsRequest,
  FrogCryptoUpdateFeedsResponseValue,
  FrogCryptoUpdateFrogsRequest,
  FrogCryptoUpdateFrogsResponseValue,
  FrogCryptoUserStateRequest,
  FrogCryptoUserStateResponseValue,
  ListFeedsResponseValue,
  PollFeedRequest,
  PollFeedResponseValue
} from "@pcd/passport-interface";
import express, { Request, Response } from "express";
import urljoin from "url-join";
import { namedSqlTransaction } from "../../database/sqlQuery";
import { ApplicationContext, GlobalServices } from "../../types";
import { logger } from "../../util/logger";
import { checkExistsForRoute } from "../../util/util";
import { checkUrlParam } from "../params";
import { PCDHTTPError } from "../pcdHttpError";

export function initFrogcryptoRoutes(
  app: express.Application,
  context: ApplicationContext,
  { frogcryptoService }: GlobalServices
): void {
  logger("[INIT] initializing frogcrypto routes");

  /**
   * Lets a Zupass client (or even a 3rd-party-developed client get PCDs from a
   * particular feed that this server is hosting.
   */
  app.get("/frogcrypto/feeds", async (req, res) => {
    checkExistsForRoute(frogcryptoService);
    const result = await frogcryptoService.handleListFeedsRequest(
      req.body as PollFeedRequest
    );
    res.json(result satisfies ListFeedsResponseValue);
  });

  /**
   * Lets a Zupass client (or even a 3rd-party-developed client get PCDs from a
   * particular feed that this server is hosting.
   */
  app.post("/frogcrypto/feeds", async (req, res) => {
    checkExistsForRoute(frogcryptoService);
    const result = await frogcryptoService.handleFeedRequest(
      req.body as PollFeedRequest
    );
    res.json(result satisfies PollFeedResponseValue);
  });

  app.get("/frogcrypto/feeds/:feedId", async (req: Request, res: Response) => {
    checkExistsForRoute(frogcryptoService);
    const feedId = checkUrlParam(req, "feedId");
    const result = await frogcryptoService.handleListSingleFeedRequest({
      feedId
    });
    if (result.feeds.length === 0) {
      throw new PCDHTTPError(404);
    }
    res.json(result);
  });

  app.get("/frogcrypto/scoreboard", async (req, res) => {
    checkExistsForRoute(frogcryptoService);
    const result = await namedSqlTransaction(
      context.dbPool,
      "/frogcrypto/scoreboard",
      (client) => frogcryptoService.getScoreboard(client)
    );
    res.json(result);
  });

  app.post("/frogcrypto/telegram-handle-sharing", async (req, res) => {
    checkExistsForRoute(frogcryptoService);
    const result = await namedSqlTransaction(
      context.dbPool,
      "/frogcrypto/telegram-handle-sharing",
      (client) =>
        frogcryptoService.updateTelegramHandleSharing(
          client,
          req.body as FrogCryptoShareTelegramHandleRequest
        )
    );
    res.json(result satisfies FrogCryptoShareTelegramHandleResponseValue);
  });

  app.post("/frogcrypto/user-state", async (req, res) => {
    checkExistsForRoute(frogcryptoService);
    const result = await namedSqlTransaction(
      context.dbPool,
      "/frogcrypto/user-state",
      (client) =>
        frogcryptoService.getUserState(
          client,
          req.body as FrogCryptoUserStateRequest
        )
    );
    res.json(result satisfies FrogCryptoUserStateResponseValue);
  });

  app.get("/frogcrypto/images/:uuid", async (req, res) => {
    const imageId = checkUrlParam(req, "uuid");

    if (!process.env.FROGCRYPTO_ASSETS_URL) {
      throw new PCDHTTPError(503, "FrogCrypto Assets Unavailable");
    }

    res.redirect(urljoin(process.env.FROGCRYPTO_ASSETS_URL, `${imageId}.png`));
  });

  app.post("/frogcrypto/admin/frogs", async (req, res) => {
    checkExistsForRoute(frogcryptoService);
    const result = await namedSqlTransaction(
      context.dbPool,
      "/frogcrypto/admin/frogs",
      (client) =>
        frogcryptoService.updateFrogData(
          client,
          req.body as FrogCryptoUpdateFrogsRequest
        )
    );
    res.json(result satisfies FrogCryptoUpdateFrogsResponseValue);
  });

  app.post("/frogcrypto/admin/delete-frogs", async (req, res) => {
    checkExistsForRoute(frogcryptoService);
    const result = await namedSqlTransaction(
      context.dbPool,
      "/frogcrypto/admin/delete-frogs",
      (client) =>
        frogcryptoService.deleteFrogData(
          client,
          req.body as FrogCryptoDeleteFrogsRequest
        )
    );
    res.json(result satisfies FrogCryptoDeleteFrogsResponseValue);
  });

  app.post("/frogcrypto/admin/feeds", async (req, res) => {
    checkExistsForRoute(frogcryptoService);
    const result = await namedSqlTransaction(
      context.dbPool,
      "/frogcrypto/admin/feeds",
      (client) =>
        frogcryptoService.updateFeedData(
          client,
          req.body as FrogCryptoUpdateFeedsRequest
        )
    );
    res.json(result satisfies FrogCryptoUpdateFeedsResponseValue);
  });
}
