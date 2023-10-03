import urlJoin from "url-join";
import {
  DownloadEncryptedStorageRequest,
  DownloadEncryptedStorageResponseValue
} from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpGetSimple } from "./makeRequest";

/**
 * Downloads, but does not decrypt, a user's end-to-end encrypted backup
 * of their PCDs and other user data. The server never learns the user's
 * encryption key.
 *
 * Never rejects. All information encoded in the resolved response.
 */
export async function requestEncryptedStorage(
  zupassServerUrl: string,
  blobKey: string,
  knownRevision?: string
): Promise<EncryptedStorageResult> {
  return httpGetSimple(
    urlJoin(zupassServerUrl, "/sync/load"),
    async (resText) => ({
      value: JSON.parse(resText) as DownloadEncryptedStorageResponseValue,
      success: true
    }),
    { blobKey, knownRevision } satisfies DownloadEncryptedStorageRequest
  );
}

export type EncryptedStorageResult =
  APIResult<DownloadEncryptedStorageResponseValue>;
