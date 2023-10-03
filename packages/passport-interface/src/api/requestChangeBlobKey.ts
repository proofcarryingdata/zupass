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
  jwt: string
): Promise<ChangeBlobKeyResult> {
  return httpPost(
    urlJoin(zupassServerUrl, `/sync/changeBlobKey`),
    {
      onValue: async () => ({ value: undefined, success: true }),
      onError: async (resText) => JSON.parse(resText)
    },
    {
      oldBlobKey,
      newBlobKey,
      newSalt,
      encryptedBlob: JSON.stringify(encryptedStorage),
      uuid
    } satisfies ChangeBlobKeyRequest,
    jwt
  );
}

export type ChangeBlobKeyResult = APIResult<
  ChangeBlobKeyResponseValue,
  ChangeBlobKeyError
>;
