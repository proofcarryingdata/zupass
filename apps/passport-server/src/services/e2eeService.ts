import {
  ChangeBlobKeyRequest,
  ChangeBlobKeyResponseValue,
  DownloadEncryptedStorageResponseValue,
  UploadEncryptedStorageRequest,
  UploadEncryptedStorageResponseValue
} from "@pcd/passport-interface";
import { SerializedPCD } from "@pcd/pcd-types";
import { SemaphoreSignaturePCD } from "@pcd/semaphore-signature-pcd";
import { Response } from "express";
import {
  UpdateEncryptedStorageResult,
  fetchEncryptedStorage,
  rekeyEncryptedStorage,
  setEncryptedStorage,
  updateEncryptedStorage
} from "../database/queries/e2ee";
import { fetchUserByUUID } from "../database/queries/users";
import { PCDHTTPError } from "../routing/pcdHttpError";
import { ApplicationContext } from "../types";
import { logger } from "../util/logger";
import { CredentialSubservice } from "./generic-issuance/subservices/CredentialSubservice";

/**
 * Responsible for storing an retrieving end to end encrypted
 * backups of users' PCDs.
 */
export class E2EEService {
  private readonly context: ApplicationContext;
  private readonly credentialSubservice: CredentialSubservice;

  public constructor(
    context: ApplicationContext,
    credentialsubservice: CredentialSubservice
  ) {
    this.context = context;
    this.credentialSubservice = credentialsubservice;
  }

  public async handleLoad(
    blobKey: string,
    knownRevision: string | undefined,
    res: Response
  ): Promise<void> {
    logger(`[E2EE] Loading ${blobKey}`);

    const storageModel = await fetchEncryptedStorage(
      this.context.dbPool,
      blobKey
    );

    if (!storageModel) {
      throw new PCDHTTPError(
        404,
        `can't load e2ee: unknown blob key ${blobKey}`
      );
    }

    const foundRevision = storageModel.revision.toString();
    const result: DownloadEncryptedStorageResponseValue = {
      revision: storageModel.revision.toString()
    };
    if (foundRevision !== knownRevision) {
      result.encryptedBlob = storageModel.encrypted_blob;
    }
    res.json(result);
  }

  private checkUpdateResult(
    blobKey: string,
    knownRevision: string,
    updateResult: UpdateEncryptedStorageResult
  ): string {
    switch (updateResult.status) {
      case "updated":
        return updateResult.revision;
      case "conflict":
        throw new PCDHTTPError(
          409,
          `can't update e2ee due to conflict: expected revision 
          ${knownRevision}, found ${updateResult.revision}`
        );
      case "missing":
        throw new PCDHTTPError(
          404,
          `can't update e2ee: unknown blob key ${blobKey}`
        );
    }
  }

  public async handleSave(
    request: UploadEncryptedStorageRequest,
    res: Response
  ): Promise<void> {
    logger(`[E2EE] Saving ${request.blobKey}`);

    if (!request.blobKey || !request.encryptedBlob) {
      throw new PCDHTTPError(400, "Missing request fields");
    }

    let v3Commitment: string | undefined = undefined;
    if (request.pcd?.pcd) {
      const verifyResult = await this.credentialSubservice.tryVerify(
        request.pcd as SerializedPCD<SemaphoreSignaturePCD>
      );

      if (!verifyResult) {
        throw new PCDHTTPError(400, "Invalid signature");
      }

      v3Commitment = verifyResult.semaphoreId;
    }

    let resultRevision = undefined;
    if (request.knownRevision === undefined) {
      resultRevision = await setEncryptedStorage(
        this.context.dbPool,
        request.blobKey,
        request.encryptedBlob,
        v3Commitment
      );
    } else {
      const updateResult = await updateEncryptedStorage(
        this.context.dbPool,
        request.blobKey,
        request.encryptedBlob,
        request.knownRevision,
        v3Commitment
      );
      resultRevision = this.checkUpdateResult(
        request.blobKey,
        request.knownRevision,
        updateResult
      );
    }

    res.json({
      revision: resultRevision
    } satisfies UploadEncryptedStorageResponseValue);
  }

  private setRekeyResult(
    blobKey: string,
    knownRevision: string | undefined,
    updateResult: UpdateEncryptedStorageResult,
    res: Response
  ): void {
    switch (updateResult.status) {
      case "updated":
        res.json({
          revision: updateResult.revision
        } as ChangeBlobKeyResponseValue);
        break;
      case "conflict":
        res.status(409).json({
          error: {
            name: "Conflict",
            detailedMessage: `Can't rekey e2ee due to conflict: expected 
              revision ${knownRevision}, found ${updateResult.revision}`
          }
        });
        break;
      case "missing":
        res.status(401).json({ error: { name: "PasswordIncorrect" } });
        break;
    }
  }

  public async handleChangeBlobKey(
    request: ChangeBlobKeyRequest,
    res: Response
  ): Promise<void> {
    logger(
      `[E2EE] Rekeying ${request.oldBlobKey} to ${request.newBlobKey} for ${request.uuid}`
    );

    if (
      !request.newBlobKey ||
      !request.oldBlobKey ||
      !request.newSalt ||
      !request.uuid ||
      !request.encryptedBlob
    ) {
      throw new PCDHTTPError(400, "Missing request fields");
    }

    let commitment: string | undefined = undefined;
    if (request.pcd) {
      const verification = await this.credentialSubservice.tryVerify(
        request.pcd
      );
      if (!verification) {
        throw new PCDHTTPError(400, "Invalid signature");
      }
      commitment = verification.semaphoreId;
    }

    // Validate user.  User must exist, and new salt must be different.
    const user = await fetchUserByUUID(this.context.dbPool, request.uuid);
    if (!user) {
      // @todo: make {@link PCDHTTPError} be able to return JSON, not just plain text
      res.status(404).json({
        error: {
          name: "UserNotFound",
          detailedMessage: "User with this uuid was not found"
        }
      });
      return;
    }

    const { salt: oldSalt } = user;
    if (oldSalt === request.newSalt) {
      res.status(400).json({
        error: {
          name: "RequiresNewSalt",
          detailedMessage: "Updated salt must be different than existing salt"
        }
      });
      return;
    }

    const rekeyResult = await rekeyEncryptedStorage(
      this.context.dbPool,
      request.oldBlobKey,
      request.newBlobKey,
      request.uuid,
      request.newSalt,
      request.encryptedBlob,
      request.knownRevision,
      commitment
    );
    this.setRekeyResult(
      request.oldBlobKey,
      request.knownRevision,
      rekeyResult,
      res
    );
  }
}

export function startE2EEService(
  context: ApplicationContext,
  credentialSubservice: CredentialSubservice
): E2EEService {
  return new E2EEService(context, credentialSubservice);
}
