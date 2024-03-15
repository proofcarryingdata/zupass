import { SerializedSemaphoreGroup } from "@pcd/semaphore-group-pcd";
import urljoin from "url-join";
import { ZuboxHistoricalSemaphoreGroupResponseValue } from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpGetSimple } from "./makeRequest";

/**
 * Hits an endpoint to download a semaphore protocol group.
 *
 * Never rejects. All information encoded in the resolved response.
 */
export async function requestZuboxHistoricalSemaphoreGroup(
  zupassServerUrl: string,
  pipelineId: string,
  groupId: string,
  rootHash: string
): Promise<ZuboxHistoricalSemaphoreGroupResponse> {
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

export type ZuboxHistoricalSemaphoreGroupResponse =
  APIResult<ZuboxHistoricalSemaphoreGroupResponseValue>;
