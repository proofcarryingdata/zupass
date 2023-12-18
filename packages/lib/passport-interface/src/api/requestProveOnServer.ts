import urlJoin from "url-join";
import { PendingPCD } from "../PendingPCDUtils";
import { ServerProofRequest } from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpPostSimple } from "./makeRequest";

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
