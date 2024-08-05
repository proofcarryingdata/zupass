import { EncryptedPacket } from "@pcd/passport-crypto";
import { SerializedPCD } from "@pcd/pcd-types";
import { SemaphoreSignaturePCD } from "@pcd/semaphore-signature-pcd";
import urlJoin from "url-join";
import {
  ChangeBlobKeyError,
  ChangeBlobKeyRequest,
  ChangeBlobKeyResponseValue
} from "../RequestTypes.js";
import { APIResult, onNamedAPIError } from "./apiResult.js";
import { httpPost } from "./makeRequest.js";

/**
 * Updates the blob key that encrypts a user's storage and updates the salt used to
 * generate the preimage to that blob key. If this request succeeds, the user's storage
 * is no longer accessible with the old blob key and the user's salt is guaranteed to
 * be different.
 *
 * Never rejects. All information encoded in the resolved response.
 */
export async function requestChangeBlobKey(
  zupassServerUrl: string,
  oldBlobKey: string,
  newBlobKey: string,
  uuid: string,
  newSalt: string,
  encryptedStorage: EncryptedPacket,
  knownRevision?: string,
  credential?: SerializedPCD<SemaphoreSignaturePCD>
): Promise<ChangeBlobKeyResult> {
  return httpPost<ChangeBlobKeyResult>(
    urlJoin(zupassServerUrl, `/sync/v3/changeBlobKey`),
    {
      onValue: async (resText: string) => ({
        value: JSON.parse(resText) as ChangeBlobKeyResponseValue,
        success: true
      }),
      onError: onNamedAPIError
    },
    {
      oldBlobKey,
      newBlobKey,
      newSalt,
      encryptedBlob: JSON.stringify(encryptedStorage),
      uuid,
      knownRevision,
      pcd: credential
    } satisfies ChangeBlobKeyRequest
  );
}

export type ChangeBlobKeyResult = APIResult<
  ChangeBlobKeyResponseValue,
  ChangeBlobKeyError
>;
