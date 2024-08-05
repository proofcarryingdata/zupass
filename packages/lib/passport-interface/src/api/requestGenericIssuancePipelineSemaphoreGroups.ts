import urljoin from "url-join";
import { GenericIssuancePipelineSemaphoreGroupsResponseValue } from "../RequestTypes.js";
import { APIResult } from "./apiResult.js";
import { httpGetSimple } from "./makeRequest.js";

/**
 * Returns details of the Semaphore Groups offered by a pipeline.
 * See {@link GenericIssuancePipelineSemaphoreGroupsResponseValue}.
 *
 * Never rejects. All information encoded in the resolved response.
 */
export async function requestGenericIssuancePipelineSemaphoreGroups(
  zupassServerUrl: string,
  pipelineId: string
): Promise<GenericIssuancePipelineSemaphoreGroupsResponse> {
  return httpGetSimple(
    urljoin(
      zupassServerUrl,
      "/generic-issuance/api/semaphore-groups",
      pipelineId
    ),
    async (resText) => ({
      value: JSON.parse(resText),
      success: true
    })
  );
}

export type GenericIssuancePipelineSemaphoreGroupsResponse =
  APIResult<GenericIssuancePipelineSemaphoreGroupsResponseValue>;
