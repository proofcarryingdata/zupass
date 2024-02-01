import urlJoin from "url-join";
import {
  GenericIssuanceGetAllUserPipelinesResponseValue,
  GenericIssuanceGetAllUserPipelinesResponseValueSchema
} from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpGetSimple } from "./makeRequest";

/**
 * Asks the server to fetch the pipeline definition corresponding to the
 * given pipeline ID. Requires cookies, as this is part of generic issuance
 * user authentication.
 */
export async function requestGenericIssuanceGetAllUserPipelines(
  zupassServerUrl: string
): Promise<GenericIssuanceGetAllUserPipelinesResponse> {
  return httpGetSimple(
    urlJoin(zupassServerUrl, `/generic-issuance/api/pipelines`),
    async (resText) => ({
      value:
        GenericIssuanceGetAllUserPipelinesResponseValueSchema.parse(resText),
      success: true
    }),
    undefined,
    true
  );
}

export type GenericIssuanceGetAllUserPipelinesResponse =
  APIResult<GenericIssuanceGetAllUserPipelinesResponseValue>;
