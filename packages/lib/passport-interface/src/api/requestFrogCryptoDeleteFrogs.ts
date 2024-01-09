import urlJoin from "url-join";
import {
  FrogCryptoDeleteFrogsRequest,
  FrogCryptoDeleteFrogsResponseValue
} from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpPostSimple } from "./makeRequest";

/**
 * Get data for all the frogs. Optionally upload new frogs.
 *
 * This endpoint is only available to authenticated admin users.
 */
export async function requestFrogCryptoDeleteFrogs(
  zupassServerUrl: string,
  req: FrogCryptoDeleteFrogsRequest
): Promise<FrogCryptoDeleteFrogsResult> {
  return httpPostSimple(
    urlJoin(zupassServerUrl, "/frogcrypto/admin/delete-frogs"),
    async (resText) => ({
      value: JSON.parse(resText) as FrogCryptoDeleteFrogsResponseValue,
      success: true
    }),
    req
  );
}

export type FrogCryptoDeleteFrogsResult =
  APIResult<FrogCryptoDeleteFrogsResponseValue>;
