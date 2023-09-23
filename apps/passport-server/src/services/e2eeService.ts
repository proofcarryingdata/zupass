import {
  EncryptedStorageResultValue,
  UploadEncryptedStorageRequest,
  UploadEncryptedStorageResponseValue
} from "@pcd/passport-interface";
import { Response } from "express";
import {
  fetchEncryptedStorage,
  insertEncryptedStorage
} from "../database/queries/e2ee";
import { PCDHTTPError } from "../routing/pcdHttpError";
import { ApplicationContext } from "../types";
import { logger } from "../util/logger";

/**
 * Responsible for storing an retrieving end to end encrypted
 * backups of users' PCDs.
 */
export class E2EEService {
  private readonly context: ApplicationContext;

  public constructor(context: ApplicationContext) {
    this.context = context;
  }

  public async handleLoad(blobKey: string, res: Response): Promise<void> {
    logger(`[E2EE] Loading ${blobKey}`);

    const storageModel = await fetchEncryptedStorage(
      this.context.dbPool,
      blobKey
    );

    if (!storageModel) {
      throw new PCDHTTPError(
        404,
        `can't load e2ee: never saved encryption key ${blobKey}`
      );
    }

    const result = JSON.parse(storageModel.encrypted_blob);

    res.json(result satisfies EncryptedStorageResultValue);
  }

  public async handleSave(
    request: UploadEncryptedStorageRequest,
    res: Response
  ): Promise<void> {
    logger(`[E2EE] Saving ${request.blobKey}`);

    await insertEncryptedStorage(
      this.context.dbPool,
      request.blobKey,
      request.encryptedBlob
    );

    res.json(undefined satisfies UploadEncryptedStorageResponseValue);
  }
}

export function startE2EEService(context: ApplicationContext): E2EEService {
  return new E2EEService(context);
}
