import urlJoin from "url-join";
import {
  FrogCryptoManageFrogsRequest,
  FrogCryptoManageFrogsResponseValue
} from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpPostSimple } from "./makeRequest";

/**
 * Get data for all the frogs. Optionally upload new frogs.
 *
 * This endpoint is only available to authenticated admin users.
 */
export async function requestFrogCryptoManageFrogs(
  zupassServerUrl: string,
  req: FrogCryptoManageFrogsRequest
): Promise<FrogCryptoManageFrogsResult> {
  return httpPostSimple(
    urlJoin(zupassServerUrl, "/frogcrypto/manage/frogs"),
    async (resText) => ({
      value: JSON.parse(resText) as FrogCryptoManageFrogsResponseValue,
      success: true
    }),
    req
  );
}

export type FrogCryptoManageFrogsResult =
  APIResult<FrogCryptoManageFrogsResponseValue>;
