import urljoin from "url-join";
import { ZuboxPipelineSemaphoreGroupsResponseValue } from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpGetSimple } from "./makeRequest";

/**
 * Returns details of the Semaphore Groups offered by a pipeline.
 * See {@link ZuboxPipelineSemaphoreGroupsResponseValue}.
 *
 * Never rejects. All information encoded in the resolved response.
 */
export async function requestZuboxPipelineSemaphoreGroups(
  zupassServerUrl: string,
  pipelineId: string
): Promise<ZuboxPipelineSemaphoreGroupsResponse> {
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

export type ZuboxPipelineSemaphoreGroupsResponse =
  APIResult<ZuboxPipelineSemaphoreGroupsResponseValue>;
