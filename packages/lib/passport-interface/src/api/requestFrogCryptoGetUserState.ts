import urlJoin from "url-join";
import {
  FrogCryptoUserStateRequest,
  FrogCryptoUserStateResponseValue
} from "../RequestTypes.js";
import { APIResult } from "./apiResult.js";
import { httpPostSimple } from "./makeRequest.js";

/**
 * Get user specific FrogCrypto state.
 *
 * @see {@link FrogCryptoUserStateRequest}
 */
export async function requestFrogCryptoGetUserState(
  zupassServerUrl: string,
  req: FrogCryptoUserStateRequest
): Promise<FrogCryptoUserStateResult> {
  return httpPostSimple(
    urlJoin(zupassServerUrl, "/frogcrypto/user-state"),
    async (resText) => ({
      value: JSON.parse(resText) as FrogCryptoUserStateResponseValue,
      success: true
    }),
    req
  );
}

export type FrogCryptoUserStateResult =
  APIResult<FrogCryptoUserStateResponseValue>;
