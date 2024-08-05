import { SerializedSemaphoreGroup } from "@pcd/semaphore-group-pcd";
import urljoin from "url-join";
import { GenericIssuanceHistoricalSemaphoreGroupResponseValue } from "../RequestTypes.js";
import { APIResult } from "./apiResult.js";
import { httpGetSimple } from "./makeRequest.js";

/**
 * Hits an endpoint to download a semaphore protocol group.
 *
 * Never rejects. All information encoded in the resolved response.
 */
export async function requestGenericIssuanceHistoricalSemaphoreGroup(
  zupassServerUrl: string,
  pipelineId: string,
  groupId: string,
  rootHash: string
): Promise<GenericIssuanceHistoricalSemaphoreGroupResponse> {
  return httpGetSimple(
    urljoin(
      zupassServerUrl,
      "/generic-issuance/api/semaphore",
      pipelineId,
      groupId,
      rootHash
    ),
    async (resText) => ({
      value: JSON.parse(resText) as SerializedSemaphoreGroup,
      success: true
    })
  );
}

export type GenericIssuanceHistoricalSemaphoreGroupResponse =
  APIResult<GenericIssuanceHistoricalSemaphoreGroupResponseValue>;
