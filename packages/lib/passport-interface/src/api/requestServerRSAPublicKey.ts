import urlJoin from "url-join";
import { APIResult } from "./apiResult";
import { httpGetSimple } from "./makeRequest";

/**
 * Asks the Zupass server for its RSA public key, which can be
 * used to verify Zupass-issued attestations.
 *
 * Never rejects. All information encoded in the resolved response.
 */
export async function requestServerRSAPublicKey(
  zupassServerUrl: string
): Promise<ServerRSAPublicKeyResult> {
  return httpGetSimple(
    urlJoin(zupassServerUrl, `/issue/rsa-public-key`),
    async (resText) => ({ value: resText, success: true })
  );
}

export type ServerRSAPublicKeyResult = APIResult<string>;
