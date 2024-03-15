import { SerializedSemaphoreGroup } from "@pcd/semaphore-group-pcd";
import urljoin from "url-join";
import { ZuboxSemaphoreGroupResponseValue } from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpGetSimple } from "./makeRequest";

/**
 * Hits an endpoint to download a semaphore protocol group.
 *
 * Never rejects. All information encoded in the resolved response.
 */
export async function requestZuboxSemaphoreGroup(
  zupassServerUrl: string,
  pipelineId: string,
  groupId: string
): Promise<ZuboxSemaphoreGroupResponse> {
  return httpGetSimple(
    urljoin(
      zupassServerUrl,
      "/generic-issuance/api/semaphore",
      pipelineId,
      groupId
    ),
    async (resText) => ({
      value: JSON.parse(resText) as SerializedSemaphoreGroup,
      success: true
    })
  );
}

export type ZuboxSemaphoreGroupResponse =
  APIResult<ZuboxSemaphoreGroupResponseValue>;
