import urlJoin from "url-join";
import {
  ZuboxGetAllUserPipelinesRequest,
  ZuboxGetAllUserPipelinesResponseValue
} from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpPostSimple } from "./makeRequest";

/**
 * Asks the server to fetch the pipeline definition corresponding to the
 * given pipeline ID. Requires cookies, as this is part of generic issuance
 * user authentication.
 */
export async function requestZuboxGetAllUserPipelines(
  zupassServerUrl: string,
  jwt: string
): Promise<ZuboxGetAllUserPipelinesResponse> {
  return httpPostSimple(
    urlJoin(zupassServerUrl, `/generic-issuance/api/get-all-user-pipelines`),
    async (resText) => ({
      value: JSON.parse(resText),
      success: true
    }),
    {
      jwt
    } satisfies ZuboxGetAllUserPipelinesRequest,
    true
  );
}

export type ZuboxGetAllUserPipelinesResponse =
  APIResult<ZuboxGetAllUserPipelinesResponseValue>;
