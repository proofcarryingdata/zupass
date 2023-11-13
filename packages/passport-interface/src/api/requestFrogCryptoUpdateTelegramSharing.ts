import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { Identity } from "@semaphore-protocol/identity";
import urlJoin from "url-join";
import {
  FrogCryptoShareTelegramHandleRequest,
  FrogCryptoShareTelegramHandleResponseValue
} from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpPostSimple } from "./makeRequest";

/**
 * Update the Telegram handle sharing status of a user.
 */
export async function requestFrogCryptoUpdateTelegramHandleSharing(
  zupassServerUrl: string,
  req: FrogCryptoShareTelegramHandleRequest
): Promise<FrogCryptoShareTelegramHandleResult> {
  return httpPostSimple(
    urlJoin(zupassServerUrl, "/frogcrypto/telegram-handle-sharing"),
    async (resText) => ({
      value: JSON.parse(resText) as FrogCryptoShareTelegramHandleResponseValue,
      success: true
    }),
    req
  );
}

export async function frogCryptoUpdateTelegramHandleSharing(
  zupassServerUrl: string,
  identity: Identity,
  signedMessage: string,
  reveal: boolean
): Promise<FrogCryptoShareTelegramHandleResult> {
  return requestFrogCryptoUpdateTelegramHandleSharing(zupassServerUrl, {
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
    reveal
  });
}

export type FrogCryptoShareTelegramHandleResult =
  APIResult<FrogCryptoShareTelegramHandleResponseValue>;
