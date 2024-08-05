import urlJoin from "url-join";
import { EdgeCityBalance } from "../edgecity.js";
import { APIResult } from "./apiResult.js";
import { httpPostSimple } from "./makeRequest.js";

export async function requestEdgeCityBalances(
  zupassServerUrl: string
): Promise<EdgeCityBalancesResult> {
  return httpPostSimple(
    urlJoin(zupassServerUrl, "/edgecity/balances"),
    async (resText) => ({
      value: JSON.parse(resText) as EdgeCityBalance[],
      success: true
    })
  );
}

export type EdgeCityBalancesResult = APIResult<EdgeCityBalance[]>;
