import urlJoin from "url-join";
import { FrogCryptoScore } from "../FrogCrypto";
import { APIResult } from "./apiResult";
import { httpGetSimple } from "./makeRequest";

export async function requestFrogCryptoGetScoreboard(
  zupassServerUrl: string
): Promise<FrogCryptoGetScoreboardResult> {
  return httpGetSimple(
    urlJoin(zupassServerUrl, "/frogcrypto/scoreboard"),
    async (resText) => ({
      value: JSON.parse(resText) as FrogCryptoScore[],
      success: true
    })
  );
}

export type FrogCryptoGetScoreboardResult = APIResult<FrogCryptoScore[]>;
