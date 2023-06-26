import {
  LoadE2EERequest,
  LoadE2EEResponse,
  SaveE2EERequest,
} from "@pcd/passport-interface";
import express, { NextFunction, Request, Response } from "express";
import {
  getEncryptedStorage,
  setEncryptedStorage,
} from "../../database/queries/e2ee";
import { ApplicationContext } from "../../types";

export function initE2EERoutes(
  app: express.Application,
  context: ApplicationContext
) {
  // Load E2EE storage for a given user.
  app.post(
    "/sync/load/",
    async (req: Request, res: Response, next: NextFunction) => {
      const request = req.body as LoadE2EERequest;

      if (request.blobKey === undefined) {
        throw new Error("Can't load e2ee: missing blobKey");
      }

      console.log(`[E2EE] Loading ${request.blobKey}`);

      try {
        const storageModel = await getEncryptedStorage(
          context,
          request.blobKey
        );

        if (!storageModel) {
          console.log(
            `can't load e2ee: never saved sync key ${request.blobKey}`
          );
          res.sendStatus(404);
          return;
        }

        const result: LoadE2EEResponse = {
          encryptedStorage: JSON.parse(storageModel.encrypted_blob),
        };

        res.json(result);
      } catch (e) {
        console.log(e);
        next(e);
      }
    }
  );

  app.post(
    "/sync/save",
    async (req: Request, res: Response, next: NextFunction) => {
      const request = req.body as SaveE2EERequest;
      console.log(`[E2EE] Saving ${request.blobKey}`);

      try {
        await setEncryptedStorage(
          context,
          request.blobKey,
          request.encryptedBlob
        );

        res.send("ok");
      } catch (e) {
        next(e);
      }
    }
  );
}
