import urlJoin from "url-join";
import {
  FrogCryptoShareTelegramHandleRequest,
  FrogCryptoShareTelegramHandleResponseValue
} from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpPostSimple } from "./makeRequest";

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
