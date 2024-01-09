import urlJoin from "url-join";
import {
  FrogCryptoUpdateFeedsRequest,
  FrogCryptoUpdateFeedsResponseValue
} from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpPostSimple } from "./makeRequest";

/**
 * Get data for all the feeds. Optionally upload new feeds or update existing feeds.
 *
 * This endpoint is only available to authenticated admin users.
 */
export async function requestFrogCryptoUpdateFeeds(
  zupassServerUrl: string,
  req: FrogCryptoUpdateFeedsRequest
): Promise<FrogCryptoUpdateFeedsResult> {
  return httpPostSimple(
    urlJoin(zupassServerUrl, "/frogcrypto/admin/feeds"),
    async (resText) => ({
      value: JSON.parse(resText) as FrogCryptoUpdateFeedsResponseValue,
      success: true
    }),
    req
  );
}

export type FrogCryptoUpdateFeedsResult =
  APIResult<FrogCryptoUpdateFeedsResponseValue>;
