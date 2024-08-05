import urlJoin from "url-join";
import { PendingPCD } from "../PendingPCDUtils.js";
import { ServerProofRequest } from "../RequestTypes.js";
import { APIResult } from "./apiResult.js";
import { httpPostSimple } from "./makeRequest.js";

/**
 * Asks the server to prove a PCD asynchronously. Returns a
 * {@link PendingPCD}.
 *
 * Never rejects. All information encoded in the resolved response.
 */
export async function requestProveOnServer(
  zupassServerUrl: string,
  serverReq: ServerProofRequest
): Promise<ProveOnServerResult> {
  return httpPostSimple(
    urlJoin(zupassServerUrl, `/pcds/prove`),
    async (resText) => ({
      value: JSON.parse(resText) as PendingPCD,
      success: true
    }),
    serverReq
  );
}

export type ProveOnServerResult = APIResult<PendingPCD>;
