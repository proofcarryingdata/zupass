import {
  FrogCryptoManageFrogsRequest,
  FrogCryptoManageFrogsResponseValue,
  FrogCryptoUserStateRequest,
  FrogCryptoUserStateResponseValue,
  ListFeedsResponseValue,
  PollFeedRequest,
  PollFeedResponseValue
} from "@pcd/passport-interface";
import express, { Request, Response } from "express";
import * as uuid from "uuid";
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

  app.get("/frogcrypto/user-state", async (req, res) => {
    const result = await frogcryptoService.getUserState(
      req.body as FrogCryptoUserStateRequest
    );
    res.json(result satisfies FrogCryptoUserStateResponseValue);
  });

  // TODO: serve real frog images
  app.get("/frogcrypto/images/:uuid", async (req, res) => {
    const imageId = checkUrlParam(req, "uuid");

    let parsedUuid;
    try {
      parsedUuid = uuid.parse(imageId);
    } catch (e) {
      throw new PCDHTTPError(400, `invalid uuid ${imageId}`);
    }

    // convert to integer - see answers to https://stackoverflow.com/q/39346517/2860309
    const buffer = Buffer.from(parsedUuid);
    const result = buffer.readUInt32BE(0);

    const frogPaths: string[] = [
      "images/frogs/frog.jpeg",
      "images/frogs/frog2.jpeg",
      "images/frogs/frog3.jpeg",
      "images/frogs/frog4.jpeg"
    ];

    res.redirect(
      `${process.env.PASSPORT_CLIENT_URL}/${
        frogPaths[result % frogPaths.length]
      }`
    );
  });

  app.post("/frogcrypto/manage/frogs", async (req, res) => {
    const result = await frogcryptoService.manageFrogData(
      req.body as FrogCryptoManageFrogsRequest
    );
    res.json(result satisfies FrogCryptoManageFrogsResponseValue);
  });
}
