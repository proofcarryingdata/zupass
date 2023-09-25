import { EDdSAPublicKey } from "@pcd/eddsa-pcd";
import urlJoin from "url-join";
import { APIResult } from "./apiResult";
import { httpGetSimple } from "./makeRequest";

/**
 * Asks the PCDpass server for its EdDSA public key, which can be
 * used to verify PCDpass-issued attestations.
 *
 * Never rejects. All information encoded in the resolved response.
 */
export async function requestServerEdDSAPublicKey(
  passportServer: string
): Promise<ServerEdDSAPublicKeyResult> {
  return httpGetSimple(
    urlJoin(passportServer, `/issue/eddsa-public-key`),
    async (resText) => ({
      value: JSON.parse(resText) as EDdSAPublicKey,
      success: true
    })
  );
}

export type ServerEdDSAPublicKeyResult = APIResult<EDdSAPublicKey>;
