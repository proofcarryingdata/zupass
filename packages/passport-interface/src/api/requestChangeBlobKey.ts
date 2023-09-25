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
 * Asks to upload an e2ee encrypted blob to the PCDpass server. The server
 * never learns the user's encryption key.
 *
 * Never rejects. All information encoded in the resolved response.
 */
export async function requestChangeBlobKey(
  passportServerUrl: string,
  oldBlobKey: string,
  newBlobKey: string,
  uuid: string,
  newSalt: string,
  encryptedStorage: EncryptedPacket
): Promise<ChangeBlobKeyResult> {
  return httpPost(
    urlJoin(passportServerUrl, `/sync/changeBlobKey`),
    {
      onValue: async () =>
        ({ value: undefined, success: true }) as ChangeBlobKeyResult,
      onError: async (resText): Promise<ChangeBlobKeyResult> =>
        JSON.parse(resText) as ChangeBlobKeyResult
    },
    {
      oldBlobKey,
      newBlobKey,
      newSalt,
      encryptedBlob: JSON.stringify(encryptedStorage),
      uuid
    } satisfies ChangeBlobKeyRequest
  );
}

export type ChangeBlobKeyResult = APIResult<
  ChangeBlobKeyResponseValue,
  ChangeBlobKeyError
>;
