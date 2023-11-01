import {
  FrogCryptoDeleteFrogsRequest,
  FrogCryptoDeleteFrogsResponseValue,
  FrogCryptoUpdateFrogsRequest,
  FrogCryptoUpdateFrogsResponseValue,
  FrogCryptoUserStateRequest,
  FrogCryptoUserStateResponseValue,
  ListFeedsResponseValue,
  PollFeedRequest,
  PollFeedResponseValue
} from "@pcd/passport-interface";
import express, { Request, Response } from "express";
import request from "request";
import urljoin from "url-join";
import {
  FeedProviderName,
  IssuanceService
} from "../../services/issuanceService";
import { ApplicationContext, GlobalServices } from "../../types";
import { logger } from "../../util/logger";
import { checkUrlParam } from "../params";
import { PCDHTTPError } from "../pcdHttpError";

export function initFrogcryptoRoutes(
  app: express.Application,
  _context: ApplicationContext,
  { issuanceService, frogcryptoService }: GlobalServices
): void {
  logger("[INIT] initializing frogcrypto routes");

  /**
   * Throws if we don't have an instance of {@link issuanceService}.
   */
  function checkIssuanceServiceStarted(
    issuanceService: IssuanceService | null
  ): asserts issuanceService {
    if (!issuanceService) {
      throw new PCDHTTPError(503, "issuance service not instantiated");
    }
  }

  /**
   * Lets a Zupass client (or even a 3rd-party-developed client get PCDs from a
   * particular feed that this server is hosting.
   */
  app.get("/frogcrypto/feeds", async (req, res) => {
    checkIssuanceServiceStarted(issuanceService);
    const result = await issuanceService.handleListFeedsRequest(
      req.body as PollFeedRequest,
      FeedProviderName.FROGCRYPTO
    );
    res.json(result satisfies ListFeedsResponseValue);
  });

  /**
   * Lets a Zupass client (or even a 3rd-party-developed client get PCDs from a
   * particular feed that this server is hosting.
   */
  app.post("/frogcrypto/feeds", async (req, res) => {
    checkIssuanceServiceStarted(issuanceService);
    const result = await issuanceService.handleFeedRequest(
      req.body as PollFeedRequest,
      FeedProviderName.FROGCRYPTO
    );
    res.json(result satisfies PollFeedResponseValue);
  });

  app.get("/frogcrypto/feeds/:feedId", async (req: Request, res: Response) => {
    checkIssuanceServiceStarted(issuanceService);
    const feedId = checkUrlParam(req, "feedId");
    if (!issuanceService.hasFeedWithId(feedId, FeedProviderName.FROGCRYPTO)) {
      throw new PCDHTTPError(404);
    }
    res.json(
      await issuanceService.handleListSingleFeedRequest(
        { feedId },
        FeedProviderName.FROGCRYPTO
      )
    );
  });

  app.post("/frogcrypto/user-state", async (req, res) => {
    const result = await frogcryptoService.getUserState(
      req.body as FrogCryptoUserStateRequest
    );
    res.json(result satisfies FrogCryptoUserStateResponseValue);
  });

  app.get("/frogcrypto/images/:uuid", async (req, res) => {
    const imageId = checkUrlParam(req, "uuid");

    if (!process.env.FROGCRYPTO_ASSETS_URL) {
      throw new PCDHTTPError(503, "FrogCrypto Assets Unavailable");
    }

    req
      .pipe(
        request(urljoin(process.env.FROGCRYPTO_ASSETS_URL, `${imageId}.png`))
      )
      .pipe(res);
  });

  app.post("/frogcrypto/admin/frogs", async (req, res) => {
    const result = await frogcryptoService.updateFrogData(
      req.body as FrogCryptoUpdateFrogsRequest
    );
    res.json(result satisfies FrogCryptoUpdateFrogsResponseValue);
  });

  app.post("/frogcrypto/admin/delete-frogs", async (req, res) => {
    const result = await frogcryptoService.deleteFrogData(
      req.body as FrogCryptoDeleteFrogsRequest
    );
    res.json(result satisfies FrogCryptoDeleteFrogsResponseValue);
  });
}
