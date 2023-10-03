import { EDdSAPublicKey } from "@pcd/eddsa-pcd";
import {
  CheckTicketInRequest,
  CheckTicketInResult,
  CheckTicketRequest,
  CheckTicketResult,
  IssuanceEnabledResponseValue,
  ListFeedsRequest,
  ListFeedsResponseValue,
  PollFeedRequest,
  PollFeedResponseValue
} from "@pcd/passport-interface";
import express, { Request, Response } from "express";
import { IssuanceService } from "../../services/issuanceService";
import { ApplicationContext, GlobalServices } from "../../types";
import { logger } from "../../util/logger";
import { checkUrlParam } from "../params";
import { PCDHTTPError } from "../pcdHttpError";

export function initPCDIssuanceRoutes(
  app: express.Application,
  _context: ApplicationContext,
  { issuanceService }: GlobalServices
): void {
  logger("[INIT] initializing PCD issuance routes");

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
   * to work, except users won't get any 'issued' tickets - Devconnect,
   * Zuconnect, Zuzalu, etc.
   */
  app.get("/issue/enabled", async (req: Request, res: Response) => {
    const result = issuanceService != null;
    res.json(result satisfies IssuanceEnabledResponseValue);
  });

  /**
   * Gets the RSA public key this server is using for its attestations, so that
   * 3rd parties can verify whether users have proper attestations.
   */
  app.get("/issue/rsa-public-key", async (req: Request, res: Response) => {
    checkIssuanceServiceStarted(issuanceService);
    const result = issuanceService.getRSAPublicKey();
    res.send(result satisfies string);
  });

  /**
   * Gets the EdDSA public key this server is using for its attestations, so that
   * 3rd parties can verify whether users have proper attestations.
   */
  app.get("/issue/eddsa-public-key", async (req: Request, res: Response) => {
    checkIssuanceServiceStarted(issuanceService);
    const result = await issuanceService.getEdDSAPublicKey();
    res.send(result satisfies EDdSAPublicKey);
  });

  /**
   * Lets the Zupass client and 3rd parties inspect what feeds are available
   * for polling on this server.
   */
  app.get("/feeds", async (req: Request, res: Response) => {
    checkIssuanceServiceStarted(issuanceService);
    const result = await issuanceService.handleListFeedsRequest(
      req.body as ListFeedsRequest
    );
    res.json(result satisfies ListFeedsResponseValue);
  });

  /**
   * Lets a Zupass client (or even a 3rd-party-developed client get PCDs from a
   * particular feed that this server is hosting.
   */
  app.post("/feeds", async (req, res) => {
    checkIssuanceServiceStarted(issuanceService);
    const result = await issuanceService.handleFeedRequest(
      req.body as PollFeedRequest,
      { jwt: req.jwt }
    );
    res.json(result satisfies PollFeedResponseValue);
  });

  app.get("/feeds/:feedId", async (req: Request, res: Response) => {
    checkIssuanceServiceStarted(issuanceService);
    const feedId = checkUrlParam(req, "feedId");
    if (!issuanceService.hasFeedWithId(feedId)) {
      throw new PCDHTTPError(404);
    }
    res.json(await issuanceService.handleListSingleFeedRequest({ feedId }));
  });

  /**
   * Checks whether the given ticket is eligible for being checked in.
   * Each reason that a ticket *wouldn't* be able to be checked in for
   * is encapuslated in the response we generate here, via {@link CheckTicketError}.
   *
   * @todo - this should probably live in a different service.
   */
  app.post("/issue/check-ticket", async (req: Request, res: Response) => {
    checkIssuanceServiceStarted(issuanceService);
    const result = await issuanceService.handleCheckTicketRequest(
      req.body as CheckTicketRequest
    );
    res.json(result satisfies CheckTicketResult);
  });

  /**
   * Checks whether the given ticket is eligible for being checked in,
   * and whether user that is trying to check them in is allowed to check
   * them in, and returns whether or not the operation succeeded.
   *
   * Both error and success cases are returned with a 200 OK status code,
   * and must be interpreted further by the client.
   *
   * @todo - this should probably live in a different service.
   */
  app.post("/issue/check-in", async (req: Request, res: Response) => {
    checkIssuanceServiceStarted(issuanceService);
    const result = await issuanceService.handleCheckInRequest(
      req.body as CheckTicketInRequest,
      req.jwt
    );
    res.json(result satisfies CheckTicketInResult);
  });
}
