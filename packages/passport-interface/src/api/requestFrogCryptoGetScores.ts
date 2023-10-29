import urlJoin from "url-join";
import { FrogCryptoScore } from "../FrogCrypto";
import { APIResult } from "./apiResult";
import { httpGetSimple } from "./makeRequest";

export async function requestFrogCryptoGetScores(
  zupassServerUrl: string
): Promise<FrogCryptoGetScoresResult> {
  return httpGetSimple(
    urlJoin(zupassServerUrl, "/frogcrypto/scores"),
    async (resText) => ({
      value: JSON.parse(resText) as FrogCryptoScore[],
      success: true
    })
  );
}

export type FrogCryptoGetScoresResult = APIResult<FrogCryptoScore[]>;
