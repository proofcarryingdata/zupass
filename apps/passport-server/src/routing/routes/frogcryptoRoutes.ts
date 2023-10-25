import { EdDSAPublicKey } from "@pcd/eddsa-pcd";
import {
  IssuanceEnabledResponseValue,
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
   * If either of the {@code process.env.SERVER_RSA_PRIVATE_KEY_BASE64} or
   * {@code process.env.SERVER_EDDSA_PRIVATE_KEY} are not initialized properly,
   * then this server won't have an {@link IssuanceService}. It'll continue
   * to work, except users won't get any 'issued' frogs.
   */
  app.get("/frogcrypto/issue/enabled", async (req: Request, res: Response) => {
    const result = issuanceService != null;
    res.json(result satisfies IssuanceEnabledResponseValue);
  });

  /**
   * Gets the RSA public key this server is using for its attestations, so that
   * 3rd parties can verify whether users have proper attestations.
   */
  app.get(
    "/frogcrypto/issue/rsa-public-key",
    async (req: Request, res: Response) => {
      checkIssuanceServiceStarted(issuanceService);
      const result = issuanceService.getRSAPublicKey();
      res.send(result satisfies string);
    }
  );

  /**
   * Gets the EdDSA public key this server is using for its attestations, so that
   * 3rd parties can verify whether users have proper attestations.
   */
  app.get(
    "/frogcrypto/issue/eddsa-public-key",
    async (req: Request, res: Response) => {
      checkIssuanceServiceStarted(issuanceService);
      const result = await issuanceService.getEdDSAPublicKey();
      res.send(result satisfies EdDSAPublicKey);
    }
  );

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
