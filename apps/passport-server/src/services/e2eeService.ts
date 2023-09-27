import {
  ChangeBlobKeyRequest,
  EncryptedStorageResultValue,
  UploadEncryptedStorageRequest,
  UploadEncryptedStorageResponseValue
} from "@pcd/passport-interface";
import { Response } from "express";
import { fetchCommitmentByUuid } from "../database/queries/commitments";
import {
  fetchEncryptedStorage,
  insertEncryptedStorage,
  updateEncryptedStorage
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

  public async handleChangeBlobKey(
    request: ChangeBlobKeyRequest,
    res: Response
  ): Promise<void> {
    logger(
      `[E2EE] Updating ${request.oldBlobKey} to ${request.newBlobKey} for ${request.uuid}`
    );

    if (
      !request.newBlobKey ||
      !request.oldBlobKey ||
      !request.newSalt ||
      !request.uuid ||
      !request.encryptedBlob
    ) {
      throw new Error("Missing request fields");
    }

    // Ensure that old blob key is correct by checking if the row exists
    const oldRow = await fetchEncryptedStorage(
      this.context.dbPool,
      request.oldBlobKey
    );
    if (!oldRow) {
      res
        .status(401)
        .json({ error: { name: "PasswordIncorrect" }, success: false });
      return;
    }

    // Ensure that new salt is different from old salt
    const commitment = await fetchCommitmentByUuid(
      this.context.dbPool,
      request.uuid
    );
    if (!commitment) {
      res
        .status(404)
        .json({
          error: {
            name: "UserNotFound",
            detailedMessage: "User with this uuid was not found",
            success: false
          }
        });
      return;
    }

    const { salt: oldSalt } = commitment;
    if (oldSalt === request.newSalt) {
      res.status(400).json({
        error: {
          name: "RequiresNewSalt",
          detailedMessage: "Updated salt must be different than existing salt",
          success: false
        }
      });
    }

    await updateEncryptedStorage(
      this.context.dbPool,
      request.oldBlobKey,
      request.newBlobKey,
      request.uuid,
      request.newSalt,
      request.encryptedBlob
    );

    res.sendStatus(200);
  }
}

export function startE2EEService(context: ApplicationContext): E2EEService {
  return new E2EEService(context);
}
