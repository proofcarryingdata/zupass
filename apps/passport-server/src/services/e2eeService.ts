import {
  LoadE2EERequest,
  LoadE2EEResponse,
  SaveE2EERequest,
} from "@pcd/passport-interface";
import { Response } from "express";
import {
  fetchEncryptedStorage,
  insertEncryptedStorage,
} from "../database/queries/e2ee";
import { ApplicationContext } from "../types";
import { getRollbar } from "./rollbarService";

export class E2EEService {
  private context: ApplicationContext;

  public constructor(context: ApplicationContext) {
    this.context = context;
  }

  public async handleLoad(request: LoadE2EERequest, res: Response) {
    console.log(`[E2EE] Loading ${request.blobKey}`);

    try {
      const storageModel = await fetchEncryptedStorage(
        this.context,
        request.blobKey
      );

      if (!storageModel) {
        console.log(`can't load e2ee: never saved sync key ${request.blobKey}`);
        res.sendStatus(404);
        return;
      }

      const result: LoadE2EEResponse = {
        encryptedStorage: JSON.parse(storageModel.encrypted_blob),
      };

      res.json(result);
    } catch (e) {
      console.log(e);
      getRollbar()?.error(e as Error);
      res.status(500);
    }
  }

  public async handleSave(request: SaveE2EERequest, res: Response) {
    console.log(`[E2EE] Saving ${request.blobKey}`);

    try {
      await insertEncryptedStorage(
        this.context,
        request.blobKey,
        request.encryptedBlob
      );

      res.sendStatus(200);
    } catch (e) {
      res.status(500);
      getRollbar()?.error(e as Error);
    }
  }
}

export function startE2EEService(context: ApplicationContext) {
  const e2eeService = new E2EEService(context);
  return e2eeService;
}
