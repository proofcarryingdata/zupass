import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { Identity } from "@semaphore-protocol/identity";
import {
  AgreeTermsPayload,
  AgreeTermsRequest,
  AgreeToTermsResponseValue
} from "../RequestTypes.js";
import { APIResult } from "./apiResult.js";
import { httpPostSimple } from "./makeRequest.js";

/**
 * Agrees to a given version of the legal terms.
 *
 * Never rejects. All information encoded in the resolved response.
 */
export async function requestAgreeTerms(
  passportServerUrl: string,
  req: AgreeTermsRequest
): Promise<AgreeTermsResult> {
  return httpPostSimple(
    `${passportServerUrl}/account/agree-terms`,
    async (resText) => ({
      value: JSON.parse(resText) as AgreeToTermsResponseValue,
      success: true
    }),
    req
  );
}

export async function agreeTerms(
  zupassServerUrl: string,
  version: number,
  identity: Identity
): Promise<AgreeTermsResult> {
  return requestAgreeTerms(zupassServerUrl, {
    // A generic authenticated route solution might make this much simpler
    pcd: await SemaphoreSignaturePCDPackage.serialize(
      await SemaphoreSignaturePCDPackage.prove({
        identity: {
          argumentType: ArgumentTypeName.PCD,
          value: await SemaphoreIdentityPCDPackage.serialize(
            await SemaphoreIdentityPCDPackage.prove({
              identity
            })
          )
        },
        signedMessage: {
          argumentType: ArgumentTypeName.String,
          value: JSON.stringify({ version } satisfies AgreeTermsPayload)
        }
      })
    )
  });
}

export type AgreeTermsResult = APIResult<AgreeToTermsResponseValue>;
