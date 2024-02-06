import urlJoin from "url-join";
import {
  GenericIssuanceSelfRequest,
  GenericIssuanceSelfResponseValue
} from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpPostSimple } from "./makeRequest";

/**
 * Asks the server to get information about the currently logged in user.
 *
 * Never rejects. All information encoded in the resolved response.
 */
export async function requestGenericIssuanceSelf(
  zupassServerUrl: string,
  jwt: string
): Promise<GenericIssuanceSelfResult> {
  return httpPostSimple(
    urlJoin(zupassServerUrl, "/generic-issuance/api/self"),
    async (resText) => {
      return {
        success: true,
        value: JSON.parse(resText) as GenericIssuanceSelfResponseValue
      };
    },
    {
      jwt
    } satisfies GenericIssuanceSelfRequest
  );
}

export type GenericIssuanceSelfResult =
  APIResult<GenericIssuanceSelfResponseValue>;
