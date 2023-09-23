import { SerializedSemaphoreGroup } from "@pcd/semaphore-group-pcd";
import { APIResult } from "./apiResult";
import { httpGetSimple } from "./makeRequest";

/**
 * Hits an endpoint to download a semaphore protocol group.
 *
 * Never rejects. All information encoded in the resolved response.
 */
export async function requestSemaphoreGroup(
  semaphoreGroupUrl: string
): Promise<SemaphoreGroupResult> {
  return httpGetSimple(semaphoreGroupUrl, async (resText) => ({
    value: JSON.parse(resText) as SerializedSemaphoreGroup,
    success: true
  }));
}

export type SemaphoreGroupResult = APIResult<SerializedSemaphoreGroup>;
