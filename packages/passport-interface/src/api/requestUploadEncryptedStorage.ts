import { EncryptedPacket } from "@pcd/passport-crypto";
import urlJoin from "url-join";
import {
  UploadEncryptedStorageRequest,
  UploadEncryptedStorageResponseValue
} from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpPostSimple } from "./makeRequest";

/**
 * Asks to upload an e2ee encrypted blob to the Zupass server. The server
 * never learns the user's encryption key.
 *
 * Never rejects. All information encoded in the resolved response.
 */
export async function requestUploadEncryptedStorage(
  zupassServerUrl: string,
  blobKey: string,
  encryptedStorage: EncryptedPacket
): Promise<UploadEncryptedStorageResult> {
  return httpPostSimple(
    urlJoin(zupassServerUrl, `/sync/save`),
    async () => ({ value: undefined, success: true }),
    {
      blobKey,
      encryptedBlob: JSON.stringify(encryptedStorage)
    } satisfies UploadEncryptedStorageRequest
  );
}

export type UploadEncryptedStorageResult =
  APIResult<UploadEncryptedStorageResponseValue>;
