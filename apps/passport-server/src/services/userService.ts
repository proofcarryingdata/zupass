import { HexString, getHash } from "@pcd/passport-crypto";
import {
  AddUserEmailResponseValue,
  AgreeTermsResult,
  ChangeUserEmailResponseValue,
  ConfirmEmailResponseValue,
  Credential,
  EmailUpdateError,
  LATEST_PRIVACY_NOTICE,
  NewUserResponseValue,
  OneClickLoginResponseValue,
  RemoveUserEmailResponseValue,
  UNREDACT_TICKETS_TERMS_VERSION,
  UpgradeUserWithV4CommitmentResult,
  VerifyTokenResponseValue,
  ZupassUserJson,
  requestPodboxOneClickEmails,
  verifyAddV4CommitmentRequestPCD
} from "@pcd/passport-interface";
import { SerializedPCD } from "@pcd/pcd-types";
import { v4PublicKeyToCommitment } from "@pcd/semaphore-identity-pcd";
import {
  SemaphoreSignaturePCD,
  SemaphoreSignaturePCDPackage
} from "@pcd/semaphore-signature-pcd";
import {
  ZUPASS_SUPPORT_EMAIL,
  getErrorMessage,
  validateEmail
} from "@pcd/util";
import { randomUUID } from "crypto";
import { sha256 } from "js-sha256";
import { PoolClient } from "postgres-pool";
import { z } from "zod";
import { UserRow } from "../database/models";
import { agreeTermsAndUnredactTickets } from "../database/queries/devconnect_pretix_tickets/devconnectPretixRedactedTickets";
import {
  deleteE2EEByV3Commitment,
  fetchEncryptedStorage
} from "../database/queries/e2ee";
import { upsertUser } from "../database/queries/saveUser";
import {
  deleteUserByUUID,
  fetchUserByEmail,
  fetchUserByUUID,
  fetchUserByV3Commitment,
  fetchUserForCredential
} from "../database/queries/users";
import { PCDHTTPError } from "../routing/pcdHttpError";
import { ApplicationContext } from "../types";
import { logger } from "../util/logger";
import { userRowToZupassUserJson } from "../util/zuzaluUser";
import { EmailService } from "./emailService";
import { EmailTokenService } from "./emailTokenService";
import { GenericIssuanceService } from "./generic-issuance/GenericIssuanceService";
import { CredentialSubservice } from "./generic-issuance/subservices/CredentialSubservice";
import { RateLimitService } from "./rateLimitService";
import { SemaphoreService } from "./semaphoreService";
import { traced } from "./telemetryService";

const AgreedTermsSchema = z.object({
  version: z.number().max(LATEST_PRIVACY_NOTICE)
});

/**
 * Responsible for high-level user-facing functionality like logging in.
 */
export class UserService {
  public readonly bypassEmail: boolean;
  private context: ApplicationContext;
  /**
   * No particular reason to limit to 6, just needed some limit.
   */
  private static readonly MAX_USER_EMAIL_ADDRESES = 6;
  private readonly semaphoreService: SemaphoreService;
  private readonly emailTokenService: EmailTokenService;
  private readonly emailService: EmailService;
  private readonly rateLimitService: RateLimitService;
  private readonly genericIssuanceService: GenericIssuanceService | null;
  private readonly credentialSubservice: CredentialSubservice;

  private stopped = false;
  private podboxSyncLoopTimeout: ReturnType<typeof setTimeout> | undefined;
  private anonymizedDevconEmails: Record<
    string /* sha256 of email */,
    string[] /* sha256's of pretix order code's */
  > = {};

  public constructor(
    context: ApplicationContext,
    semaphoreService: SemaphoreService,
    emailTokenService: EmailTokenService,
    emailService: EmailService,
    rateLimitService: RateLimitService,
    genericIssuanceService: GenericIssuanceService | null,
    credentialSubservice: CredentialSubservice
  ) {
    this.context = context;
    this.semaphoreService = semaphoreService;
    this.emailTokenService = emailTokenService;
    this.emailService = emailService;
    this.rateLimitService = rateLimitService;
    this.genericIssuanceService = genericIssuanceService;
    this.credentialSubservice = credentialSubservice;
    this.bypassEmail =
      process.env.BYPASS_EMAIL_REGISTRATION === "true" &&
      process.env.NODE_ENV !== "production";
  }

  public async start(): Promise<void> {
    if (this.stopped) {
      logger("[USER_SERVICE] stopped - not scheduling another sync");
      return;
    }

    try {
      await this.syncPodboxEmails();
    } catch (e) {
      logger("[USER_SERVICE] Error syncing podbox emails", e);
    }

    const syncInterval = 1000 * 45;
    logger(`[USER_SERVICE] scheduling another podbox sync in ${syncInterval}`);
    this.podboxSyncLoopTimeout = setTimeout(async () => {
      this.start();
    }, syncInterval);
  }

  public stop(): void {
    this.stopped = true;
    clearTimeout(this.podboxSyncLoopTimeout);
  }

  private async syncPodboxEmails(): Promise<void> {
    return traced("USER_SERVICE", "syncPodboxEmails", async () => {
      if (
        !process.env.DEVCON_PODBOX_API_URL ||
        !process.env.DEVCON_PIPELINE_ID ||
        !process.env.DEVCON_PODBOX_API_KEY
      ) {
        logger("[USER_SERVICE] No podbox credentials found, skipping sync");
        return;
      }

      logger("[USER_SERVICE] Scheduling devcon podbox sync");

      const res = await requestPodboxOneClickEmails(
        process.env.DEVCON_PODBOX_API_URL,
        process.env.DEVCON_PIPELINE_ID,
        process.env.DEVCON_PODBOX_API_KEY
      );

      if (res.success) {
        logger(
          `[USER_SERVICE] successfully completed devcon podbox sync, got ${res.value?.values?.length} emails`
        );
        this.anonymizedDevconEmails = res.value.values;
      } else {
        logger("[USER_SERVICE] Error syncing podbox emails", res.error);
      }
    });
  }

  public async getSaltByEmail(
    client: PoolClient,
    email: string
  ): Promise<string | null> {
    const user = await this.getUserByEmail(client, email);

    if (!user) {
      throw new PCDHTTPError(404, `user ${email} does not exist`);
    }

    return user.salt;
  }

  /**
   * Returns the encryption key for a given user, if it is stored on
   * our server. Returns null if the user does not exist, or if
   * the user does not have an encryption key stored on the server.
   */
  public async getEncryptionKeyForUser(
    client: PoolClient,
    email: string
  ): Promise<HexString | null> {
    const existingUser = await fetchUserByEmail(client, email);
    return existingUser?.encryption_key ?? null;
  }

  public async handleSendTokenEmail(
    client: PoolClient,
    email: string,
    force: boolean
  ): Promise<ConfirmEmailResponseValue> {
    logger(
      `[USER_SERVICE] send-token-email ${JSON.stringify({
        email,
        force
      })}`
    );

    if (!validateEmail(email)) {
      throw new PCDHTTPError(400, `'${email}' is not a valid email`);
    }

    if (
      !(await this.rateLimitService.requestRateLimitedAction(
        this.context.dbPool,
        "REQUEST_EMAIL_TOKEN",
        email
      ))
    ) {
      throw new PCDHTTPError(401, "Too many attempts. Come back later.");
    }

    const newEmailToken = await this.emailTokenService.saveNewTokenForEmail(
      client,
      email
    );
    let existingCommitment = await fetchUserByEmail(client, email);
    if (
      existingCommitment?.encryption_key &&
      process.env.DELETE_MISSING_USERS === "true"
    ) {
      const blobKey = await getHash(existingCommitment.encryption_key);
      const storage = await fetchEncryptedStorage(client, blobKey);
      if (!storage) {
        logger(
          `[USER_SERVICE] Deleting user with no storage: ${JSON.stringify(
            existingCommitment
          )}`
        );
        await deleteUserByUUID(client, existingCommitment.uuid);
        existingCommitment = null;
      }
    }

    if (
      existingCommitment !== null &&
      !force &&
      // Users with an `encryption_key` do not have a password,
      // so we will need to verify email ownership with code.
      !existingCommitment.encryption_key
    ) {
      throw new PCDHTTPError(403, `'${email}' already registered`);
    }

    if (this.bypassEmail) {
      logger("[DEV] Bypassing email, returning token");
      return {
        devToken: newEmailToken
      } satisfies ConfirmEmailResponseValue;
    }

    logger(`[USER_SERVICE] Sending token=${newEmailToken} to email=${email}`);
    await this.emailService.sendTokenEmail(email, newEmailToken);

    return undefined;
  }

  /**
   * Checks whether allowing a user to reset their account one more time
   * would cause them to exceed the account reset rate limit. If it does,
   * throws an error. If it doesn't, the rate limit service will increment
   * a counter and allow the action to proceed. Can only be called on users
   * that have already created an account.
   */
  private async checkAccountResetRateLimit(
    client: PoolClient,
    user: UserRow
  ): Promise<void> {
    if (process.env.ACCOUNT_RESET_RATE_LIMIT_DISABLED === "true") {
      logger("[USER_SERVICE] account rate limit disabled");
      return;
    }

    const allowed = await this.rateLimitService.requestRateLimitedAction(
      this.context.dbPool,
      "ACCOUNT_RESET",
      user.uuid
    );

    if (!allowed) {
      throw new PCDHTTPError(
        429,
        "You've exceeded the maximum number of account resets." +
          ` Please contact ${ZUPASS_SUPPORT_EMAIL} for further assistance.`
      );
    }
  }

  public async handleOneClickLogin(
    client: PoolClient,
    email: string,
    code: string,
    commitment: string,
    v4PublicKey: string,
    encryption_key: string
  ): Promise<OneClickLoginResponseValue> {
    const validDevcon = this.anonymizedDevconEmails[sha256(email)]?.includes(
      sha256(code)
    );

    const valid =
      validDevcon ||
      (await this.genericIssuanceService?.validateEmailAndPretixOrderCode(
        client,
        email,
        code
      ));

    if (!valid) {
      throw new PCDHTTPError(
        403,
        "Invalid Zupass link. Please log in through the home page."
      );
    }

    let existingUser = await fetchUserByEmail(client, email);
    if (
      existingUser?.encryption_key &&
      process.env.DELETE_MISSING_USERS === "true"
    ) {
      const blobKey = await getHash(existingUser.encryption_key);
      const storage = await fetchEncryptedStorage(client, blobKey);
      if (!storage) {
        logger(
          `[USER_SERVICE] Deleting user with no storage: ${JSON.stringify(
            existingUser
          )}`
        );
        await deleteUserByUUID(client, existingUser.uuid);
        existingUser = null;
      }
    }

    if (existingUser) {
      return {
        isNewUser: false,
        encryptionKey: existingUser.encryption_key
      } satisfies OneClickLoginResponseValue;
    }
    // todo: rate limit
    await upsertUser(client, {
      uuid: randomUUID(),
      emails: [email],
      commitment,
      semaphore_v4_pubkey: v4PublicKey,
      semaphore_v4_commitment: v4PublicKeyToCommitment(v4PublicKey),
      encryption_key,
      terms_agreed: LATEST_PRIVACY_NOTICE,
      extra_issuance: false
    });

    // Reload Merkle trees
    this.semaphoreService.scheduleReload();

    const user = await fetchUserByEmail(client, email);
    if (!user) {
      throw new PCDHTTPError(403, "No user with that email exists");
    }

    // Slightly redundantly, this will set the "terms agreed" again
    // However, having a single canonical transaction for this seems like
    // a benefit
    logger(
      `[USER_SERVICE] Agreeing to terms: ${LATEST_PRIVACY_NOTICE}`,
      user.uuid
    );
    await agreeTermsAndUnredactTickets(
      client,
      user.uuid,
      LATEST_PRIVACY_NOTICE
    );

    const userJson = userRowToZupassUserJson(user);

    logger(`[USER_SERVICE] logged in a user`, userJson);

    return {
      isNewUser: true,
      zupassUser: userJson
    } satisfies OneClickLoginResponseValue;
  }

  public async handleNewUser(
    client: PoolClient,
    token: string,
    email: string,
    commitment: string,
    v4PublicKey: string,
    salt: string | undefined,
    encryption_key: string | undefined,
    autoRegister: boolean | undefined
  ): Promise<NewUserResponseValue> {
    logger(
      `[USER_SERVICE] new-user ${JSON.stringify({
        token,
        email,
        commitment,
        v4PublicKey
      })}`
    );

    if ((!salt && !encryption_key) || (salt && encryption_key)) {
      throw new PCDHTTPError(
        400,
        "Must have exactly either salt or encryptionKey, but not both or none."
      );
    }

    const existingUser = await fetchUserByEmail(client, email);

    // Prevent accidental account re-creation/reset for one-click links clicked by existing users
    if (existingUser && autoRegister) {
      throw new PCDHTTPError(
        403,
        `The email ${email} has already been registered. Please log in instead.`
      );
    }

    if (
      !(await this.emailTokenService.checkTokenCorrect(client, email, token))
    ) {
      throw new PCDHTTPError(
        403,
        autoRegister
          ? `Invalid link. Please manually create an account with ${email}.`
          : `Wrong token. If you got more than one email, use the latest one.`
      );
    }

    if (existingUser) {
      await this.checkAccountResetRateLimit(client, existingUser);
    }

    await this.emailTokenService.saveNewTokenForEmail(client, email);

    logger(`[USER_SERVICE] Saving commitment: ${commitment}, ${v4PublicKey}`);
    await upsertUser(client, {
      uuid: existingUser ? existingUser.uuid : randomUUID(),
      emails: existingUser ? existingUser.emails : [email],
      commitment,
      semaphore_v4_pubkey: v4PublicKey,
      semaphore_v4_commitment: v4PublicKeyToCommitment(v4PublicKey),
      salt,
      encryption_key,
      // If the user already exists, then they're accessing this via the
      // "forgot password" flow, and not the registration flow in which they
      // are prompted to agree to the latest legal terms. In this case,
      // preserve whichever version they already agreed to.
      terms_agreed: existingUser
        ? existingUser.terms_agreed
        : LATEST_PRIVACY_NOTICE,
      extra_issuance: false
    });

    // Reload Merkle trees
    this.semaphoreService.scheduleReload();

    const user = await fetchUserByEmail(client, email);
    if (!user) {
      throw new PCDHTTPError(403, "no user with that email exists");
    }

    // Slightly redundantly, this will set the "terms agreed" again
    // However, having a single canonical transaction for this seems like
    // a benefit
    logger(`[USER_SERVICE] Unredacting tickets for email`, user.uuid);
    await agreeTermsAndUnredactTickets(
      client,
      user.uuid,
      LATEST_PRIVACY_NOTICE
    );

    const userJson = userRowToZupassUserJson(user);
    const response: NewUserResponseValue = {
      ...userJson
    };

    logger(`[USER_SERVICE] logged in a user`, userJson);
    return response;
  }

  /**
   * If the service is not ready, returns a 500 server error.
   * If the user does not exist, returns a 404.
   * Otherwise returns the user.
   */
  public async handleGetUser(
    client: PoolClient,
    uuid: string
  ): Promise<ZupassUserJson> {
    logger(`[USER_SERVICE] Fetching user ${uuid}`);

    const user = await this.getUserByUUID(client, uuid);

    if (!user) {
      throw new PCDHTTPError(410, `no user with uuid '${uuid}'`);
    }

    return userRowToZupassUserJson(user);
  }

  /**
   * Returns either the user, or null if no user with the given uuid can be found.
   */
  public async getUserByUUID(
    client: PoolClient,
    uuid: string
  ): Promise<UserRow | null> {
    const user = await fetchUserByUUID(client, uuid);

    if (!user) {
      logger("[SEMA] no user with that email exists");
      return null;
    }
    return user;
  }

  /**
   * Gets a user by email address, or null if no user with that email exists.
   */
  public async getUserByEmail(
    client: PoolClient,
    email: string
  ): Promise<UserRow | null> {
    const user = await fetchUserByEmail(client, email);

    if (!user) {
      logger("[SEMA] no user with that email exists");
      return null;
    }

    return user;
  }

  /**
   * Returns either the user, or null if no user with the given commitment can be found.
   */
  public async getUserByCommitment(
    client: PoolClient,
    commitment: string
  ): Promise<UserRow | null> {
    const user = await fetchUserByV3Commitment(client, commitment);

    if (!user) {
      logger("[SEMA] no user with that commitment exists");
      return null;
    }

    return user;
  }

  public async handleDeleteAccount(
    client: PoolClient,
    serializedPCD: SerializedPCD<SemaphoreSignaturePCD>
  ): Promise<void> {
    const verifyResult =
      await this.credentialSubservice.tryVerify(serializedPCD);

    const user = await fetchUserForCredential(client, verifyResult);

    if (!user) {
      throw new Error("User not found");
    }

    await deleteUserByUUID(client, user.uuid);
    await deleteE2EEByV3Commitment(client, user.commitment);
  }

  public async getUserForUnverifiedCredential(
    client: PoolClient,
    credential: Credential
  ): Promise<UserRow | null> {
    return fetchUserForCredential(
      client,
      await this.credentialSubservice.verifyAndExpectZupassEmail(credential)
    );
  }

  /**
   * @param sig created by {@link makeAddV4CommitmentRequest}
   */
  public async handleAddV4Commitment(
    client: PoolClient,
    sig: SerializedPCD<SemaphoreSignaturePCD>
  ): Promise<UpgradeUserWithV4CommitmentResult> {
    const v3Sig = await SemaphoreSignaturePCDPackage.deserialize(sig.pcd);

    const verification = await verifyAddV4CommitmentRequestPCD(v3Sig);

    if (!verification) {
      throw new PCDHTTPError(400);
    }

    const user = await fetchUserByV3Commitment(
      client,
      verification.v3Commitment
    );

    if (!user) {
      throw new PCDHTTPError(400, "User not found");
    }

    if (!user.semaphore_v4_commitment && !user.semaphore_v4_pubkey) {
      user.semaphore_v4_commitment = verification.v4Commitment;
      user.semaphore_v4_pubkey = verification.v4PublicKey;
      await upsertUser(client, user);
    } else if (
      user.semaphore_v4_commitment !== verification.v4Commitment ||
      user.semaphore_v4_pubkey !== verification.v4PublicKey
    ) {
      logger(
        `[USER_SERVICE] User ${user.uuid} already has a v4 commitment. Skipping update. ` +
          `Was ${user.semaphore_v4_commitment}-${user.semaphore_v4_pubkey}, trying to set to ${verification.v4Commitment}-${verification.v4PublicKey}`
      );
    }

    return {
      success: true,
      value: undefined
    };
  }

  /**
   * Updates the version of the legal terms the user agrees to
   */
  public async handleAgreeTerms(
    client: PoolClient,
    serializedPCD: SerializedPCD<SemaphoreSignaturePCD>
  ): Promise<AgreeTermsResult> {
    const pcd = await SemaphoreSignaturePCDPackage.deserialize(
      serializedPCD.pcd
    );
    if (!(await SemaphoreSignaturePCDPackage.verify(pcd))) {
      return {
        success: false,
        error: "Invalid signature"
      };
    }

    const parsedPayload = AgreedTermsSchema.safeParse(
      JSON.parse(pcd.claim.signedMessage)
    );

    if (!parsedPayload.success) {
      return {
        success: false,
        error: "Invalid terms specified"
      };
    }

    const payload = parsedPayload.data;
    const user = await fetchUserByV3Commitment(
      client,
      pcd.claim.identityCommitment
    );
    if (!user) {
      return {
        success: false,
        error: "User does not exist"
      };
    }

    // If the user hasn't already agreed to have their tickets unredacted,
    // do it now
    if (
      payload.version >= UNREDACT_TICKETS_TERMS_VERSION &&
      user.terms_agreed < UNREDACT_TICKETS_TERMS_VERSION
    ) {
      logger(
        `[USER_SERVICE] Unredacting tickets for email due to accepting version ${payload.version} of legal terms`,
        user.uuid
      );
      await agreeTermsAndUnredactTickets(client, user.uuid, payload.version);
    } else {
      logger(
        `[USER_SERVICE] Updating user to version ${payload.version} of legal terms`,
        user.uuid
      );
      await upsertUser(client, {
        ...user,
        terms_agreed: payload.version
      });
    }

    return {
      success: true,
      value: { version: payload.version }
    };
  }

  public async handleVerifyToken(
    client: PoolClient,
    token: string,
    email: string
  ): Promise<VerifyTokenResponseValue> {
    if (
      !(await this.rateLimitService.requestRateLimitedAction(
        this.context.dbPool,
        "CHECK_EMAIL_TOKEN",
        email
      ))
    ) {
      throw new PCDHTTPError(401, "Too many attempts. Come back later.");
    }

    const tokenCorrect = await this.emailTokenService.checkTokenCorrect(
      client,
      email,
      token
    );

    if (!tokenCorrect) {
      throw new PCDHTTPError(
        403,
        "Wrong token. If you got more than one email, use the latest one."
      );
    }

    const user = await this.getUserByEmail(client, email);

    // If we return the user's encryption key, change the token so this request
    // can't be replayed.
    if (user?.encryption_key) {
      await this.emailTokenService.saveNewTokenForEmail(client, email);
    }

    return {
      encryptionKey: user?.encryption_key ?? null
    };
  }

  /**
   * If `confirmationCode` is `undefined`, sends a confirmation email and
   * exits without any updates to the user.
   */
  public async handleAddUserEmail(
    client: PoolClient,
    emailToAdd: string,
    unverifiedCredential: SerializedPCD<SemaphoreSignaturePCD>,
    confirmationCode?: string
  ): Promise<AddUserEmailResponseValue> {
    logger(
      "[USER_SERVICE] handleAddUserEmail",
      emailToAdd,
      confirmationCode,
      unverifiedCredential
    );

    const requestingUser = await this.getUserForUnverifiedCredential(
      client,
      unverifiedCredential
    );
    if (!requestingUser) {
      throw new PCDHTTPError(400, EmailUpdateError.InvalidCredential);
    }

    if (!validateEmail(emailToAdd)) {
      throw new PCDHTTPError(400, EmailUpdateError.InvalidInput);
    }

    const maybeExistingUserOfNewEmail = await this.getUserByEmail(
      client,
      emailToAdd
    );
    if (maybeExistingUserOfNewEmail) {
      throw new PCDHTTPError(400, EmailUpdateError.EmailAlreadyRegistered);
    }

    if (confirmationCode === undefined) {
      const newToken = await this.emailTokenService.saveNewTokenForEmail(
        client,
        emailToAdd
      );

      if (this.bypassEmail) {
        logger("[DEV] Bypassing email, returning token", newToken);
        return { sentToken: true, token: newToken };
      }

      await this.emailService.sendTokenEmail(emailToAdd, newToken);

      return { sentToken: true };
    }

    const isCodeValid = await this.emailTokenService.checkTokenCorrect(
      client,
      emailToAdd,
      confirmationCode
    );
    if (!isCodeValid) {
      throw new PCDHTTPError(400, EmailUpdateError.InvalidConfirmationCode);
    }

    if (requestingUser.emails.includes(emailToAdd)) {
      throw new PCDHTTPError(400, EmailUpdateError.EmailAlreadyRegistered);
    }

    if (
      requestingUser.emails.length + 1 >=
      UserService.MAX_USER_EMAIL_ADDRESES
    ) {
      throw new PCDHTTPError(400, EmailUpdateError.TooManyEmails);
    }

    try {
      const newEmailList = [...requestingUser.emails, emailToAdd];

      await upsertUser(client, {
        ...requestingUser,
        emails: newEmailList
      });

      return { newEmailList, sentToken: false };
    } catch {
      throw new PCDHTTPError(400, EmailUpdateError.Unknown);
    }
  }

  public async handleRemoveUserEmail(
    client: PoolClient,
    emailToRemove: string,
    unverifiedCredential: SerializedPCD<SemaphoreSignaturePCD>
  ): Promise<RemoveUserEmailResponseValue> {
    logger(
      "[USER_SERVICE] handleRemoveUserEmail",
      emailToRemove,
      unverifiedCredential
    );

    const requestingUser = await this.getUserForUnverifiedCredential(
      client,
      unverifiedCredential
    );
    if (!requestingUser) {
      throw new PCDHTTPError(400, EmailUpdateError.InvalidCredential);
    }

    if (!requestingUser.emails.includes(emailToRemove)) {
      throw new PCDHTTPError(
        400,
        EmailUpdateError.EmailNotAssociatedWithThisAccount
      );
    }

    if (requestingUser.emails.length === 1) {
      throw new PCDHTTPError(400, EmailUpdateError.CantDeleteOnlyEmail);
    }

    const newEmailList = requestingUser.emails.filter(
      (email) => email !== emailToRemove
    );

    try {
      await upsertUser(client, {
        ...requestingUser,
        emails: newEmailList
      });
      return { newEmailList };
    } catch (e) {
      throw new PCDHTTPError(400, getErrorMessage(e));
    }
  }

  /**
   * If `confirmationCode` is `undefined`, sends a confirmation email and
   * exits without any updates to the user.
   */
  public async handleChangeUserEmail(
    client: PoolClient,
    oldEmail: string,
    newEmail: string,
    unverifiedCredential: SerializedPCD<SemaphoreSignaturePCD>,
    confirmationCode?: string
  ): Promise<ChangeUserEmailResponseValue> {
    logger(
      "[USER_SERVICE] handleChangeUserEmail",
      oldEmail,
      newEmail,
      confirmationCode,
      unverifiedCredential
    );

    const requestingUser = await this.getUserForUnverifiedCredential(
      client,
      unverifiedCredential
    );
    if (!requestingUser) {
      throw new PCDHTTPError(400, EmailUpdateError.InvalidCredential);
    }

    const maybeExistingUserOfNewEmail = await this.getUserByEmail(
      client,
      newEmail
    );
    if (maybeExistingUserOfNewEmail) {
      throw new PCDHTTPError(400, EmailUpdateError.EmailAlreadyRegistered);
    }

    if (requestingUser.emails.length !== 1) {
      throw new PCDHTTPError(
        400,
        EmailUpdateError.CantChangeWhenMultipleEmails
      );
    }

    if (oldEmail !== requestingUser.emails[0]) {
      throw new PCDHTTPError(
        400,
        EmailUpdateError.EmailNotAssociatedWithThisAccount
      );
    }

    if (newEmail === oldEmail) {
      throw new PCDHTTPError(400, EmailUpdateError.EmailAlreadyRegistered);
    }

    if (confirmationCode === undefined) {
      const newToken = await this.emailTokenService.saveNewTokenForEmail(
        client,
        newEmail
      );

      if (this.bypassEmail) {
        logger("[DEV] Bypassing email, returning token", newToken);
        return { sentToken: true, token: newToken };
      }

      await this.emailService.sendTokenEmail(newEmail, newToken);

      return { sentToken: true };
    }

    const isCodeValid = await this.emailTokenService.checkTokenCorrect(
      client,
      newEmail,
      confirmationCode
    );

    if (!isCodeValid) {
      throw new PCDHTTPError(400, EmailUpdateError.InvalidConfirmationCode);
    }

    try {
      const newEmailList = [newEmail];

      await upsertUser(client, {
        ...requestingUser,
        emails: newEmailList
      });

      return { newEmailList, sentToken: false };
    } catch (e) {
      throw new PCDHTTPError(500, getErrorMessage(e));
    }
  }
}

export function startUserService(
  context: ApplicationContext,
  semaphoreService: SemaphoreService | null,
  emailTokenService: EmailTokenService,
  emailService: EmailService,
  rateLimitService: RateLimitService,
  genericIssuanceService: GenericIssuanceService | null,
  credentialSubservice: CredentialSubservice
): UserService | null {
  if (process.env.SELF_HOSTED_PODBOX_MODE === "true") {
    logger(
      `[INIT] SELF_HOSTED_PODBOX_MODE is true - not starting user service`
    );
    return null;
  }

  if (!semaphoreService) {
    logger("[USER_SERVICE] can't start user service - no semaphore service");
    return null;
  }

  const userService = new UserService(
    context,
    semaphoreService,
    emailTokenService,
    emailService,
    rateLimitService,
    genericIssuanceService,
    credentialSubservice
  );

  userService.start();

  return userService;
}
