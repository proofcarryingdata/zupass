import urlJoin from "url-join";
import { APIResult } from "./apiResult";
import { httpGetSimple } from "./makeRequest";

/**
 * Asks the PCDpass server for its RSA public key, which can be
 * used to verify PCDpass-issued attestations.
 *
 * Never rejects. All information encoded in the resolved response.
 */
export async function requestServerRSAPublicKey(
  passportServerUrl: string
): Promise<ServerRSAPublicKeyResult> {
  return httpGetSimple(
    urlJoin(passportServerUrl, `/issue/rsa-public-key`),
    async (resText) => ({ value: resText, success: true })
  );
}

export type ServerRSAPublicKeyResult = APIResult<string>;
