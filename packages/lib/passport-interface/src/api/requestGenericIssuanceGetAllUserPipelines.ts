import urlJoin from "url-join";
import {
  GenericIssuanceGetAllUserPipelinesRequest,
  GenericIssuanceGetAllUserPipelinesResponseValue
} from "../RequestTypes.js";
import { APIResult } from "./apiResult.js";
import { httpPostSimple } from "./makeRequest.js";

/**
 * Asks the server to fetch the pipeline definition corresponding to the
 * given pipeline ID. Requires cookies, as this is part of generic issuance
 * user authentication.
 */
export async function requestGenericIssuanceGetAllUserPipelines(
  zupassServerUrl: string,
  jwt: string
): Promise<GenericIssuanceGetAllUserPipelinesResponse> {
  return httpPostSimple(
    urlJoin(zupassServerUrl, `/generic-issuance/api/get-all-user-pipelines`),
    async (resText) => ({
      value: JSON.parse(resText),
      success: true
    }),
    {
      jwt
    } satisfies GenericIssuanceGetAllUserPipelinesRequest,
    true
  );
}

export type GenericIssuanceGetAllUserPipelinesResponse =
  APIResult<GenericIssuanceGetAllUserPipelinesResponseValue>;
