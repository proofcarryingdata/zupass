import urljoin from "url-join";
import { GenericIssuanceValidSemaphoreGroupResponseValue } from "../RequestTypes.js";
import { APIResult } from "./apiResult.js";
import { httpGetSimple } from "./makeRequest.js";

/**
 * Returns true if the root hash has ever existed for a group, false otherwise.
 *
 * Never rejects. All information encoded in the resolved response.
 */
export async function requestGenericIssuanceValidSemaphoreGroup(
  zupassServerUrl: string,
  pipelineId: string,
  groupId: string,
  rootHash: string
): Promise<GenericIssuanceValidSemaphoreGroupResponse> {
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

export type GenericIssuanceValidSemaphoreGroupResponse =
  APIResult<GenericIssuanceValidSemaphoreGroupResponseValue>;
