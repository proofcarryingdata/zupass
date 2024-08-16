import urljoin from "url-join";
import {
  AddV4CommitmentRequest,
  AddV4CommitmentResponseValue
} from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpPostSimple } from "./makeRequest";

/**
 * Asks a feed for new PCDs.
 *
 * Never rejects. All information encoded in the resolved response.
 */
export async function requestAddSemaphoreV4Commitment(
  zupassServerUrl: string,
  req: AddV4CommitmentRequest
): Promise<AddV4CommitmentResult> {
  return httpPostSimple(
    urljoin(zupassServerUrl, "/account/add-v4-commitment"),
    async (resText) => ({
      value: JSON.parse(resText) as AddV4CommitmentResponseValue,
      success: true
    }),
    req
  );
}

export type AddV4CommitmentResult = APIResult<AddV4CommitmentResponseValue>;
