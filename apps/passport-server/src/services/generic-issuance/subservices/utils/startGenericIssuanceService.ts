import { EdDSAPublicKey, isEdDSAPublicKey } from "@pcd/eddsa-pcd";
import { RollbarService } from "@pcd/server-shared";
import stytch, { Client } from "stytch";
import { ILemonadeAPI } from "../../../../apis/lemonade/lemonadeAPI";
import { IGenericPretixAPI } from "../../../../apis/pretix/genericPretixAPI";
import { ApplicationContext, ServerMode } from "../../../../types";
import { logger } from "../../../../util/logger";
import { DiscordService } from "../../../discordService";
import { EmailService } from "../../../emailService";
import { PagerDutyService } from "../../../pagerDutyService";
import { PersistentCacheService } from "../../../persistentCacheService";
import { GenericIssuanceService } from "../../GenericIssuanceService";
import { CredentialSubservice } from "../CredentialSubservice";

/**
 * Instantiates and starts a {@link GenericIssuanceService}.
 */
export async function startGenericIssuanceService(
  context: ApplicationContext,
  rollbarService: RollbarService | null,
  lemonadeAPI: ILemonadeAPI | null,
  genericPretixAPI: IGenericPretixAPI | null,
  pagerDutyService: PagerDutyService | null,
  discordService: DiscordService | null,
  cacheService: PersistentCacheService | null,
  emailService: EmailService,
  credentialSubservice: CredentialSubservice
): Promise<GenericIssuanceService | null> {
  logger("[INIT] attempting to start Generic Issuance service");

  if (process.env.DISABLE_JOBS === "true") {
    logger("[INIT] generic issuance service not starting because DISABLE_JOBS");
    return null;
  }

  if (![ServerMode.UNIFIED, ServerMode.PARALLEL_MAIN].includes(context.mode)) {
    logger(
      `[INIT] generic issuance service not started, not in unified or parallel main mode`
    );
    return null;
  }

  if (!cacheService) {
    logger(
      "[INIT] not starting generic issuance service - missing persistent cache service"
    );
    return null;
  }

  if (!lemonadeAPI) {
    logger(
      "[INIT] not starting generic issuance service - missing lemonade API"
    );
    return null;
  }

  if (!genericPretixAPI) {
    logger("[INIT] not starting generic issuance service - missing pretix API");
    return null;
  }

  const pkeyEnv = process.env.GENERIC_ISSUANCE_EDDSA_PRIVATE_KEY;
  if (!pkeyEnv) {
    logger(
      "[INIT] missing environment variable GENERIC_ISSUANCE_EDDSA_PRIVATE_KEY"
    );
    return null;
  }

  if (
    process.env.NODE_ENV === "production" &&
    process.env.STYTCH_BYPASS === "true"
  ) {
    throw new Error(
      "cannot create generic issuance service without stytch in production "
    );
  }

  const BYPASS_EMAIL =
    process.env.NODE_ENV !== "production" &&
    process.env.STYTCH_BYPASS === "true";

  const projectIdEnv = process.env.STYTCH_PROJECT_ID;
  const secretEnv = process.env.STYTCH_SECRET;
  let stytchClient: Client | undefined = undefined;

  if (!BYPASS_EMAIL) {
    if (!projectIdEnv) {
      logger("[INIT] missing environment variable STYTCH_PROJECT_ID");
      return null;
    }

    if (!secretEnv) {
      logger("[INIT] missing environment variable STYTCH_SECRET");
      return null;
    }

    stytchClient = new stytch.Client({
      project_id: projectIdEnv,
      secret: secretEnv
    });
  }

  const genericIssuanceClientUrl = process.env.GENERIC_ISSUANCE_CLIENT_URL;
  if (!genericIssuanceClientUrl) {
    logger("[INIT] missing GENERIC_ISSUANCE_CLIENT_URL");
    return null;
  }

  const zupassPublicKeyEnv = process.env.GENERIC_ISSUANCE_ZUPASS_PUBLIC_KEY;
  if (!zupassPublicKeyEnv) {
    logger("[INIT missing GENERIC_ISSUANCE_ZUPASS_PUBLIC_KEY");
    return null;
  }

  let zupassPublicKey: EdDSAPublicKey;
  try {
    zupassPublicKey = JSON.parse(zupassPublicKeyEnv);
    if (!isEdDSAPublicKey(zupassPublicKey)) {
      throw new Error("Invalid public key");
    }
  } catch (e) {
    logger("[INIT] invalid GENERIC_ISSUANCE_ZUPASS_PUBLIC_KEY");
    return null;
  }

  const issuanceService = new GenericIssuanceService(
    context,
    zupassPublicKey,
    pkeyEnv,
    genericIssuanceClientUrl,
    genericPretixAPI,
    lemonadeAPI,
    stytchClient,
    rollbarService,
    pagerDutyService,
    discordService,
    emailService,
    cacheService,
    credentialSubservice
  );

  issuanceService.start();

  return issuanceService;
}
