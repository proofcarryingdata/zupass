import urlJoin from "url-join";
import {
  FrogCryptoShareTelegramHandleRequest,
  FrogCryptoShareTelegramHandleResponseValue
} from "../RequestTypes.js";
import { APIResult } from "./apiResult.js";
import { httpPostSimple } from "./makeRequest.js";

/**
 * Update the Telegram handle sharing status of a user.
 */
export async function requestFrogCryptoUpdateTelegramHandleSharing(
  zupassServerUrl: string,
  req: FrogCryptoShareTelegramHandleRequest
): Promise<FrogCryptoShareTelegramHandleResult> {
  return httpPostSimple(
    urlJoin(zupassServerUrl, "/frogcrypto/telegram-handle-sharing"),
    async (resText) => ({
      value: JSON.parse(resText) as FrogCryptoShareTelegramHandleResponseValue,
      success: true
    }),
    req
  );
}

export type FrogCryptoShareTelegramHandleResult =
  APIResult<FrogCryptoShareTelegramHandleResponseValue>;
