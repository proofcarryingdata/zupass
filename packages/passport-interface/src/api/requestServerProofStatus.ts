import urlJoin from "url-join";
import { ProofStatusRequest, ProofStatusResponseValue } from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpGetSimple } from "./makeRequest";

/**
 * Asks the PCDpass server about the status of particular pending PCD proof.
 *
 * Never rejects. All information encoded in the resolved response.
 *
 * @todo - deprecate this
 */
export async function requestServerProofStatus(
  passportServerUrl: string,
  proveRequest: ProofStatusRequest
): Promise<ServerProofStatusResult> {
  return httpGetSimple(
    urlJoin(passportServerUrl, `/pcds/status`),
    async (resText) => ({
      value: JSON.parse(resText) as ProofStatusResponseValue,
      success: true
    }),
    proveRequest
  );
}

export type ServerProofStatusResult = APIResult<ProofStatusResponseValue>;
