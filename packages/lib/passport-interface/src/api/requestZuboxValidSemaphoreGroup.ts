import urljoin from "url-join";
import { ZuboxValidSemaphoreGroupResponseValue } from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpGetSimple } from "./makeRequest";

/**
 * Returns true if the root hash has ever existed for a group, false otherwise.
 *
 * Never rejects. All information encoded in the resolved response.
 */
export async function requestZuboxValidSemaphoreGroup(
  zupassServerUrl: string,
  pipelineId: string,
  groupId: string,
  rootHash: string
): Promise<ZuboxValidSemaphoreGroupResponse> {
  return httpGetSimple(
    urljoin(
      zupassServerUrl,
      "/generic-issuance/api/semaphore",
      pipelineId,
      groupId,
      "valid",
      rootHash
    ),
    async (resText) => ({
      value: JSON.parse(resText),
      success: true
    })
  );
}

export type ZuboxValidSemaphoreGroupResponse =
  APIResult<ZuboxValidSemaphoreGroupResponseValue>;
