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
import { logger } from "../util/logger";
import { RollbarService } from "./rollbarService";

/**
 * Responsible for storing an retrieving end to end encrypted
 * backups of users' PCDs.
 */
export class E2EEService {
  private context: ApplicationContext;
  private rollbarService: RollbarService | null;

  public constructor(
    context: ApplicationContext,
    rollbarService: RollbarService | null
  ) {
    this.context = context;
    this.rollbarService = rollbarService;
  }

  public async handleLoad(
    request: LoadE2EERequest,
    res: Response
  ): Promise<void> {
    try {
      logger(`[E2EE] Loading ${request.blobKey}`);
      const storageModel = await fetchEncryptedStorage(
        this.context.dbPool,
        request.blobKey
      );

      if (!storageModel) {
        logger(`can't load e2ee: never saved sync key ${request.blobKey}`);
        res.sendStatus(404);
        return;
      }

      const result: LoadE2EEResponse = {
        encryptedStorage: JSON.parse(storageModel.encrypted_blob),
      };

      res.json(result);
    } catch (e) {
      logger(e);
      this.rollbarService?.reportError(e);
      res.sendStatus(500);
    }
  }

  public async handleSave(
    request: SaveE2EERequest,
    res: Response
  ): Promise<void> {
    try {
      logger(`[E2EE] Saving ${request.blobKey}`);

      await insertEncryptedStorage(
        this.context.dbPool,
        request.blobKey,
        request.encryptedBlob
      );

      res.sendStatus(200);
    } catch (e) {
      logger(e);
      this.rollbarService?.reportError(e);
      res.sendStatus(500);
    }
  }
}

export function startE2EEService(
  context: ApplicationContext,
  rollbarService: RollbarService | null
): E2EEService {
  const e2eeService = new E2EEService(context, rollbarService);
  return e2eeService;
}
