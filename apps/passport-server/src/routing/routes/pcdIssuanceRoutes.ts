import { EdDSAPublicKey } from "@pcd/eddsa-pcd";
import {
  IssuanceEnabledResponseValue,
  KnownTicketTypesResult,
  ListFeedsRequest,
  ListFeedsResponseValue,
  PollFeedRequest,
  PollFeedResponseValue,
  VerifyTicketRequest,
  VerifyTicketResult
} from "@pcd/passport-interface";
import express, { Request, Response } from "express";
import { sqlQueryWithPool } from "../../database/sqlQuery";
import { ApplicationContext, GlobalServices } from "../../types";
import { logger } from "../../util/logger";
import { checkExistsForRoute } from "../../util/util";
import { clusterProxy } from "../middlewares/clusterMiddleware";
import { checkUrlParam } from "../params";
import { PCDHTTPError } from "../pcdHttpError";

export function initPCDIssuanceRoutes(
  app: express.Application,
  context: ApplicationContext,
  { issuanceService }: GlobalServices
): void {
  logger("[INIT] initializing PCD issuance routes");

  /**
   * If either of the `process.env.SERVER_RSA_PRIVATE_KEY_BASE64` or
   * `process.env.SERVER_EDDSA_PRIVATE_KEY` are not initialized properly,
   * then this server won't have an {@link IssuanceService}. It'll continue
   * to work, except users won't get any 'issued' tickets - Devconnect,
   * Zuconnect, Zuzalu, etc.
   */
  app.get(
    "/issue/enabled",
    clusterProxy(),
    async (req: Request, res: Response) => {
      const result = issuanceService !== null;
      res.json(result satisfies IssuanceEnabledResponseValue);
    }
  );

  /**
   * Gets the RSA public key this server is using for its attestations, so that
   * 3rd parties can verify whether users have proper attestations.
   */
  app.get(
    "/issue/rsa-public-key",
    clusterProxy(),
    async (req: Request, res: Response) => {
      checkExistsForRoute(issuanceService);
      const result = issuanceService.getRSAPublicKey();
      res.send(result satisfies string);
    }
  );

  /**
   * Gets the EdDSA public key this server is using for its attestations, so that
   * 3rd parties can verify whether users have proper attestations.
   */
  app.get(
    "/issue/eddsa-public-key",
    clusterProxy(),
    async (req: Request, res: Response) => {
      checkExistsForRoute(issuanceService);
      const result = await issuanceService.getEdDSAPublicKey();
      res.send(result satisfies EdDSAPublicKey);
    }
  );

  /**
   * Lets the Zupass client and 3rd parties inspect what feeds are available
   * for polling on this server.
   */
  app.get("/feeds", clusterProxy(), async (req: Request, res: Response) => {
    checkExistsForRoute(issuanceService);
    const result = await issuanceService.handleListFeedsRequest(
      req.body as ListFeedsRequest
    );
    res.json(result satisfies ListFeedsResponseValue);
  });

  /**
   * Lets a Zupass client (or even a 3rd-party-developed client get PCDs from a
   * particular feed that this server is hosting.
   */
  app.post("/feeds", clusterProxy(), async (req, res) => {
    checkExistsForRoute(issuanceService);
    const result = await issuanceService.handleFeedRequest(
      req.body as PollFeedRequest
    );
    res.json(result satisfies PollFeedResponseValue);
  });

  app.get(
    "/feeds/:feedId",
    clusterProxy(),
    async (req: Request, res: Response) => {
      checkExistsForRoute(issuanceService);
      const feedId = checkUrlParam(req, "feedId");
      if (!issuanceService.hasFeedWithId(feedId)) {
        throw new PCDHTTPError(404);
      }
      res.json(await issuanceService.handleListSingleFeedRequest({ feedId }));
    }
  );

  /**
   * For non-Devconnect ticket PCDs, the standard QR code generates a link
   * to a verification screen in passport-client, which calls this endpoint
   * to verify the ticket. Tickets are only verified if they match criteria
   * known to belong to Zuconnect '23 or Zuzalu '23 tickets.
   */
  app.post(
    "/issue/verify-ticket",
    clusterProxy(),
    async (req: Request, res: Response) => {
      checkExistsForRoute(issuanceService);
      await sqlQueryWithPool(context.dbPool, async (client) => {
        const result = await issuanceService.handleVerifyTicketRequest(
          client,
          req.body as VerifyTicketRequest
        );
        return res.json(result satisfies VerifyTicketResult);
      });
    }
  );

  app.get(
    "/issue/known-ticket-types",
    clusterProxy(),
    async (req: Request, res: Response) => {
      checkExistsForRoute(issuanceService);
      await sqlQueryWithPool(context.dbPool, async (client) => {
        const result =
          await issuanceService.handleKnownTicketTypesRequest(client);
        return res.json(result satisfies KnownTicketTypesResult);
      });
    }
  );
}
