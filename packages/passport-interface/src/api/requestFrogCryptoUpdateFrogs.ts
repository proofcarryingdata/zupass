import urlJoin from "url-join";
import {
  FrogCryptoUpdateFrogsRequest,
  FrogCryptoUpdateFrogsResponseValue
} from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpPostSimple } from "./makeRequest";

/**
 * Get data for all the frogs. Optionally upload new frogs.
 *
 * This endpoint is only available to authenticated admin users.
 */
export async function requestFrogCryptoUpdateFrogs(
  zupassServerUrl: string,
  req: FrogCryptoUpdateFrogsRequest
): Promise<FrogCryptoUpdateFrogsResult> {
  return httpPostSimple(
    urlJoin(zupassServerUrl, "/frogcrypto/admin/frogs"),
    async (resText) => ({
      value: JSON.parse(resText) as FrogCryptoUpdateFrogsResponseValue,
      success: true
    }),
    req
  );
}

export type FrogCryptoUpdateFrogsResult =
  APIResult<FrogCryptoUpdateFrogsResponseValue>;
