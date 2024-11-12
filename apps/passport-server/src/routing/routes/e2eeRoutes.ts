import {
  ChangeBlobKeyRequest,
  UploadEncryptedStorageRequest
} from "@pcd/passport-interface";
import express, { Request, Response } from "express";
import { sqlQueryWithPool, sqlTransaction } from "../../database/sqlQuery";
import { ApplicationContext, GlobalServices } from "../../types";
import { logger } from "../../util/logger";
import { checkExistsForRoute } from "../../util/util";
import { clusterProxy } from "../middlewares/clusterMiddleware";
import { checkOptionalQueryParam, checkQueryParam } from "../params";

export function initE2EERoutes(
  app: express.Application,
  context: ApplicationContext,
  { e2eeService }: GlobalServices
): void {
  logger("[INIT] initializing e2ee routes");

  /**
   * Given a ChangeBlobKeyRequest in the request body, performs the steps
   * necessary to change the user's storage key: deleting old encrypted
   * storage, storing the new encrypted storage, and updating the user's
   * salt so they can re-derive their key.
   */
  app.post(
    "/sync/v3/changeBlobKey",
    clusterProxy(),
    async (req: Request, res: Response) => {
      checkExistsForRoute(e2eeService);
      const request = req.body as ChangeBlobKeyRequest;

      const result = await sqlTransaction(context.dbPool, (client) =>
        e2eeService.handleChangeBlobKey(client, request)
      );

      res.status(200).json(result);
    }
  );

  /**
   * Given a `blobKey`, which is a hash of the user's encryption key (which
   * itself is a function of their password and salt), returns the encrypted
   * blob stored in the e2ee db table, encoded in a
   * {@link DownloadEncryptedStorageResponseValue}.
   *
   * If no e2ee entry exists for the given `blobKey`, returns a 404.
   *
   * @todo - restrict the calling of this api somehow? at least a rate limit.
   */
  app.get(
    "/sync/v3/load/",
    clusterProxy(),
    async (req: Request, res: Response) => {
      checkExistsForRoute(e2eeService);
      const result = await sqlQueryWithPool(context.dbPool, (client) =>
        e2eeService.handleLoad(
          client,
          checkQueryParam(req, "blobKey"),
          checkOptionalQueryParam(req, "knownRevision")
        )
      );

      res.status(200).json(result);
    }
  );

  /**
   * Sibling api route to /sync/load/.
   *
   * Takes a {@link UploadEncryptedStorageRequest} in the request body,
   * and saves it to the e2ee table, so that it can later be retrieved
   * using the same `blobKey`.
   *
   * Returns a 200 OK in the success case.
   *
   * @todo - restrict + rate limit this?
   * @todo - size limits?
   */
  app.post(
    "/sync/v3/save",
    clusterProxy(),
    async (req: Request, res: Response) => {
      checkExistsForRoute(e2eeService);
      const request = req.body as UploadEncryptedStorageRequest;
      const result = await sqlQueryWithPool(context.dbPool, (client) =>
        e2eeService.handleSave(client, request)
      );

      res.status(200).json(result);
    }
  );
}
