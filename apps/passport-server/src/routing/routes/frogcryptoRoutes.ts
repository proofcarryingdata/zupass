import {
  ListFeedsResponseValue,
  PollFeedRequest,
  PollFeedResponseValue
} from "@pcd/passport-interface";
import express, { Request, Response } from "express";
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
  { issuanceService }: GlobalServices
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
}
