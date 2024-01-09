import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { Identity } from "@semaphore-protocol/identity";
import urlJoin from "url-join";
import {
  FrogCryptoUserStateRequest,
  FrogCryptoUserStateResponseValue
} from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpPostSimple } from "./makeRequest";

/**
 * Get user specific FrogCrypto state.
 *
 * @see {@link FrogCryptoUserStateRequest}
 */
export async function requestFrogCryptoGetUserState(
  zupassServerUrl: string,
  req: FrogCryptoUserStateRequest
): Promise<FrogCryptoUserStateResult> {
  return httpPostSimple(
    urlJoin(zupassServerUrl, "/frogcrypto/user-state"),
    async (resText) => ({
      value: JSON.parse(resText) as FrogCryptoUserStateResponseValue,
      success: true
    }),
    req
  );
}

export async function frogCryptoGetUserState(
  zupassServerUrl: string,
  identity: Identity,
  signedMessage: string,
  feedIds: string[]
): Promise<FrogCryptoUserStateResult> {
  return requestFrogCryptoGetUserState(zupassServerUrl, {
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
          value: signedMessage
        }
      })
    ),
    feedIds
  });
}

export type FrogCryptoUserStateResult =
  APIResult<FrogCryptoUserStateResponseValue>;
