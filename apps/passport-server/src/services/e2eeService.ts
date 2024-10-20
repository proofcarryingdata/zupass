import {
  ChangeBlobKeyRequest,
  ChangeBlobKeyResponseValue,
  DownloadEncryptedStorageResponseValue,
  UploadEncryptedStorageRequest,
  UploadEncryptedStorageResponseValue
} from "@pcd/passport-interface";
import { SerializedPCD } from "@pcd/pcd-types";
import { SemaphoreSignaturePCD } from "@pcd/semaphore-signature-pcd";
import { PoolClient } from "postgres-pool";
import {
  UpdateEncryptedStorageResult,
  fetchEncryptedStorage,
  rekeyEncryptedStorage,
  setEncryptedStorage,
  updateEncryptedStorage
} from "../database/queries/e2ee";
import { fetchUserByUUID } from "../database/queries/users";
import { PCDHTTPError, PCDHTTPJSONError } from "../routing/pcdHttpError";
import { logger } from "../util/logger";
import { CredentialSubservice } from "./generic-issuance/subservices/CredentialSubservice";

/**
 * Responsible for storing an retrieving end to end encrypted
 * backups of users' PCDs.
 */
export class E2EEService {
  private readonly credentialSubservice: CredentialSubservice;

  public constructor(credentialsubservice: CredentialSubservice) {
    this.credentialSubservice = credentialsubservice;
  }

  public async handleLoad(
    client: PoolClient,
    blobKey: string,
    knownRevision: string | undefined
  ): Promise<DownloadEncryptedStorageResponseValue> {
    logger(`[E2EE] Loading ${blobKey}`);

    const storageModel = await fetchEncryptedStorage(client, blobKey);

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

    return result;
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
    client: PoolClient,
    request: UploadEncryptedStorageRequest
  ): Promise<UploadEncryptedStorageResponseValue> {
    logger(`[E2EE] Saving ${request.blobKey}`);

    if (!request.blobKey || !request.encryptedBlob) {
      throw new PCDHTTPError(400, "Missing request fields");
    }

    let commitment: string | undefined = undefined;
    if (request.pcd?.pcd) {
      const verifyResult = await this.credentialSubservice.tryVerify(
        request.pcd as SerializedPCD<SemaphoreSignaturePCD>
      );

      if (!verifyResult) {
        throw new PCDHTTPError(400, "Invalid signature");
      }

      commitment = verifyResult.semaphoreId;
    }

    let resultRevision = undefined;
    if (request.knownRevision === undefined) {
      resultRevision = await setEncryptedStorage(
        client,
        request.blobKey,
        request.encryptedBlob,
        commitment
      );
    } else {
      const updateResult = await updateEncryptedStorage(
        client,
        request.blobKey,
        request.encryptedBlob,
        request.knownRevision,
        commitment
      );
      resultRevision = this.checkUpdateResult(
        request.blobKey,
        request.knownRevision,
        updateResult
      );
    }

    return {
      revision: resultRevision
    } satisfies UploadEncryptedStorageResponseValue;
  }

  private setRekeyResult(
    blobKey: string,
    knownRevision: string | undefined,
    updateResult: UpdateEncryptedStorageResult
  ): ChangeBlobKeyResponseValue {
    switch (updateResult.status) {
      case "updated":
        return {
          revision: updateResult.revision
        } as ChangeBlobKeyResponseValue;
      case "conflict":
        throw new PCDHTTPJSONError(409, {
          error: {
            name: "Conflict",
            detailedMessage: `Can't rekey e2ee due to conflict: expected 
              revision ${knownRevision}, found ${updateResult.revision}`
          }
        });
      case "missing":
        throw new PCDHTTPJSONError(401, {
          error: { name: "PasswordIncorrect" }
        });
    }
  }

  public async handleChangeBlobKey(
    client: PoolClient,
    request: ChangeBlobKeyRequest
  ): Promise<ChangeBlobKeyResponseValue> {
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
    const user = await fetchUserByUUID(client, request.uuid);
    if (!user) {
      throw new PCDHTTPJSONError(404, {
        error: {
          name: "UserNotFound",
          detailedMessage: "User with this uuid was not found"
        }
      });
    }

    const { salt: oldSalt } = user;
    if (oldSalt === request.newSalt) {
      throw new PCDHTTPJSONError(400, {
        error: {
          name: "RequiresNewSalt",
          detailedMessage: "Updated salt must be different than existing salt"
        }
      });
    }

    const rekeyResult = await rekeyEncryptedStorage(
      client,
      request.oldBlobKey,
      request.newBlobKey,
      request.uuid,
      request.newSalt,
      request.encryptedBlob,
      request.knownRevision,
      commitment
    );

    return this.setRekeyResult(
      request.oldBlobKey,
      request.knownRevision,
      rekeyResult
    );
  }
}

export function startE2EEService(
  credentialSubservice: CredentialSubservice
): E2EEService {
  return new E2EEService(credentialSubservice);
}
