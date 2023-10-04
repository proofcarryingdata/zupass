import { EncryptedPacket } from "@pcd/passport-crypto";
import urlJoin from "url-join";
import {
  ChangeBlobKeyError,
  ChangeBlobKeyRequest,
  ChangeBlobKeyResponseValue
} from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpPost } from "./makeRequest";

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
  baseRevision?: string
): Promise<ChangeBlobKeyResult> {
  return httpPost<ChangeBlobKeyResult>(
    urlJoin(zupassServerUrl, `/sync/changeBlobKey`),
    {
      onValue: async (resText: string) => ({
        value: JSON.parse(resText) as ChangeBlobKeyResponseValue,
        success: true
      }),
      onError: async (resText: string) => {
        // TODO(atwyman): Clean up this inconsistent client/server error handling pattern.
        const res = JSON.parse(resText);
        if (res.error?.name) {
          return {
            error: res.error satisfies ChangeBlobKeyError,
            success: false
          };
        } else if (res.error?.detailedMessage) {
          return {
            error: {
              ...res.error,
              name: "ServerError"
            },
            success: false
          };
        } else {
          return {
            error: {
              name: "ServerError",
              detailedMessage: resText
            },
            success: false
          };
        }
      }
    },
    {
      oldBlobKey,
      newBlobKey,
      newSalt,
      encryptedBlob: JSON.stringify(encryptedStorage),
      uuid,
      baseRevision
    } satisfies ChangeBlobKeyRequest
  );
}

export type ChangeBlobKeyResult = APIResult<
  ChangeBlobKeyResponseValue,
  ChangeBlobKeyError
>;
