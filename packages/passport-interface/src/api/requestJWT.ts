import { ArgumentTypeName, SerializedPCD } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import {
  SemaphoreSignaturePCD,
  SemaphoreSignaturePCDPackage
} from "@pcd/semaphore-signature-pcd";
import { Identity } from "@semaphore-protocol/identity";
import urlJoin from "url-join";
import {
  GetTokenRequest,
  GetTokenResponseValue as GetJWTResponseValue,
  ISSUANCE_STRING
} from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpPostSimple } from "./makeRequest";

/**
 * Asks the Zupass server for a JWT.
 *
 * Never rejects. All information encoded in the resolved response.
 */
export async function requestJWT(
  zupassServerUrl: string,
  proof: SerializedPCD<SemaphoreSignaturePCD>
): Promise<RequestJWTResult> {
  return httpPostSimple(
    urlJoin(zupassServerUrl, "/account/get-token"),
    async (resText) => ({
      value: JSON.parse(resText) as GetJWTResponseValue,
      success: true
    }),
    {
      proof
    } satisfies GetTokenRequest
  );
}

/**
 * Generates a credential based on a semaphore identity and calls {@link requestCheckIn}
 * to try to check a ticket in.
 */
export async function requestJWTUsingIdentity(
  zupassServerUrl: string,
  identity: Identity
) {
  return requestJWT(
    zupassServerUrl,
    await SemaphoreSignaturePCDPackage.serialize(
      await SemaphoreSignaturePCDPackage.prove({
        identity: {
          argumentType: ArgumentTypeName.PCD,
          value: await SemaphoreIdentityPCDPackage.serialize(
            await SemaphoreIdentityPCDPackage.prove({
              identity: identity
            })
          )
        },
        signedMessage: {
          argumentType: ArgumentTypeName.String,
          value: ISSUANCE_STRING
        }
      })
    )
  );
}

export type RequestJWTResult = APIResult<GetJWTResponseValue>;
