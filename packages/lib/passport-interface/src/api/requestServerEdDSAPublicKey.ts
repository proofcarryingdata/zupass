import { EdDSAPublicKey } from "@pcd/eddsa-pcd";
import urlJoin from "url-join";
import { APIResult } from "./apiResult.js";
import { httpGetSimple } from "./makeRequest.js";

/**
 * Asks the Zupass server for its EdDSA public key, which can be
 * used to verify Zupass-issued attestations.
 *
 * Never rejects. All information encoded in the resolved response.
 */
export async function requestServerEdDSAPublicKey(
  zupassServerUrl: string
): Promise<ServerEdDSAPublicKeyResult> {
  return httpGetSimple(
    urlJoin(zupassServerUrl, `/issue/eddsa-public-key`),
    async (resText) => ({
      value: JSON.parse(resText) as EdDSAPublicKey,
      success: true
    })
  );
}

export type ServerEdDSAPublicKeyResult = APIResult<EdDSAPublicKey>;
