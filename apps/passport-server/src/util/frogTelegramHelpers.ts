import { EdDSAFrogPCDPackage } from "@pcd/eddsa-frog-pcd";
import { getEdDSAPublicKey } from "@pcd/eddsa-pcd";
import { constructZupassPcdGetRequestUrl } from "@pcd/passport-interface";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import {
  ZKEdDSAFrogPCD,
  ZKEdDSAFrogPCDArgs,
  ZKEdDSAFrogPCDPackage
} from "@pcd/zk-eddsa-frog-pcd";
import { PoolClient } from "postgres-pool";
import { insertTelegramVerification } from "../database/queries/telegram/insertTelegramConversation";
import { loadRSAPrivateKey } from "../services/issuanceService";
import { traced } from "../services/telemetryService";
import { logger } from "../util/logger";

export const generateFrogProofUrl = async (
  telegramUserId: number,
  telegramChatId: string,
  telegramUsername?: string
): Promise<string> => {
  return traced("telegram", "generateFrogProofUrl", async (span) => {
    span?.setAttribute("userId", telegramUserId.toString());

    const args: ZKEdDSAFrogPCDArgs = {
      frog: {
        argumentType: ArgumentTypeName.PCD,
        pcdType: EdDSAFrogPCDPackage.name,
        value: undefined,
        userProvided: true,
        displayName: "Your Frog",
        description: "chose a frog",
        validatorParams: {
          notFoundMessage: "You don't have a frog."
        },
        hideIcon: true
      },
      identity: {
        argumentType: ArgumentTypeName.PCD,
        pcdType: SemaphoreIdentityPCDPackage.name,
        value: undefined,
        userProvided: true
      },
      externalNullifier: {
        argumentType: ArgumentTypeName.BigInt,
        value: undefined,
        userProvided: false
      },
      watermark: {
        argumentType: ArgumentTypeName.BigInt,
        value: telegramUserId.toString(),
        userProvided: false,
        description:
          "This encodes your Telegram user ID so that the proof can grant only you access to the TG group."
      }
    };

    let passportOrigin = `${process.env.PASSPORT_CLIENT_URL}/`;
    if (passportOrigin === "http://localhost:3000/") {
      // TG bot doesn't like localhost URLs
      passportOrigin = "http://127.0.0.1:3000/";
    }

    // pass telegram username as path param if nonempty
    let returnUrl = `${process.env.PASSPORT_SERVER_URL}/telegram/verify?chatId=${telegramChatId}&userId=${telegramUserId}`;
    if (telegramUsername && telegramUsername.length > 0)
      returnUrl += `&username=${telegramUsername}`;

    span?.setAttribute("returnUrl", returnUrl);

    const proofUrl = constructZupassPcdGetRequestUrl<
      typeof ZKEdDSAFrogPCDPackage
    >(passportOrigin, returnUrl, ZKEdDSAFrogPCDPackage.name, args, {
      genericProveScreen: true,
      title: "",
      description:
        "ZuKat requests a zero-knowledge proof of your frog to join a Telegram group."
    });
    span?.setAttribute("proofUrl", proofUrl);

    return proofUrl;
  });
};

/**
 * Verify that a PCD relates to a frog. If so, invite the user to the chat.
 */
export const handleFrogVerification = async (
  client: PoolClient,
  serializedZKEdDSAFrogPCD: string,
  telegramUserId: number,
  telegramChatId: number,
  telegramUsername?: string
): Promise<void> => {
  return traced("telegram", "handleFrogVerification", async (span) => {
    span?.setAttribute("userId", telegramUserId.toString());
    let pcd: ZKEdDSAFrogPCD;

    try {
      pcd = await ZKEdDSAFrogPCDPackage.deserialize(
        JSON.parse(serializedZKEdDSAFrogPCD).pcd
      );
    } catch (e) {
      throw new Error(`Deserialization error, ${e}`);
    }

    // Check signer
    if (!process.env.SERVER_EDDSA_PRIVATE_KEY)
      throw new Error(`Missing server eddsa private key .env value`);

    // This Pubkey value should work for staging + prod as well, but needs to be tested
    const rsaPrivateKey = loadRSAPrivateKey();
    if (!rsaPrivateKey) throw new Error(`No RSA private key found`);
    // NOTE: Correct for Issuance Service error by generating the EdDSA public key from the RSA private key.
    // Due to the fact that RSA is 1024 bit and EdDSA is 256 bits, the RSA gets modded by 256
    // and we have a deterministicly generated EdDSA key
    const serverEddsaPublicKey = await getEdDSAPublicKey(
      rsaPrivateKey.exportKey("private")
    );

    const signerMatch =
      pcd.claim.signerPublicKey[0] === serverEddsaPublicKey[0] &&
      pcd.claim.signerPublicKey[1] === serverEddsaPublicKey[1];
    if (!signerMatch) {
      throw new Error(
        `PCD claim signer public key ${pcd.claim.signerPublicKey} does not match server public key ${serverEddsaPublicKey}`
      );
    }
    span?.setAttribute("signerMatch", signerMatch);

    // Check watermark
    const watermarkMatch = pcd.claim.watermark === telegramUserId.toString();
    if (!watermarkMatch) {
      throw new Error(
        `Telegram User id ${telegramUserId} does not match given watermark ${pcd.claim.watermark}`
      );
    }
    span?.setAttribute("watermarkMatch", watermarkMatch);

    // Check owner semaphore id
    const { ownerSemaphoreId } = pcd.claim.partialFrog;
    if (!ownerSemaphoreId) {
      throw new Error(
        `User ${telegramUserId} did not reveal their semaphore id`
      );
    }
    span?.setAttribute("semaphoreId", ownerSemaphoreId);

    if (
      // TODO: wrap in a MultiProcessService?
      !(await ZKEdDSAFrogPCDPackage.verify(pcd))
    ) {
      throw new Error(`Could not verify PCD for ${telegramUserId}`);
    }
    span?.setAttribute("verifiedPCD", true);

    logger(
      `[TELEGRAM] Verified PCD for ${telegramUserId}, chat ${telegramChatId}` +
        (telegramUsername && `, username ${telegramUsername}`)
    );

    // We've verified that the chat exists, now add the user to our list.
    // This will be important later when the user requests to join.
    await insertTelegramVerification(
      client,
      telegramUserId,
      telegramChatId,
      ownerSemaphoreId,
      telegramUsername
    );
  });
};
