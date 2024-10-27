import { EdDSAPublicKey } from "@pcd/eddsa-pcd";
import { EdDSATicketPCD, EdDSATicketPCDTypeName } from "@pcd/eddsa-ticket-pcd";
import { PCDAction } from "@pcd/pcd-collection";
import { ArgsOf, PCDOf, PCDPackage, SerializedPCD } from "@pcd/pcd-types";
import { IPODTicketData } from "@pcd/pod-ticket-pcd/src/schema";
import { SerializedSemaphoreGroup } from "@pcd/semaphore-group-pcd";
import { SemaphoreSignaturePCD } from "@pcd/semaphore-signature-pcd";
import { Credential } from "./Credential";
import {
  DexFrog,
  FrogCryptoDbFeedData,
  FrogCryptoFrogData,
  FrogCryptoScore
} from "./FrogCrypto";
import { PendingPCDStatus } from "./PendingPCDUtils";
import { Feed } from "./SubscriptionManager";
import { PodboxTicketAction } from "./TicketAction";
import { NamedAPIError } from "./api/apiResult";
import {
  ActionScreenConfig,
  BadgeConfig,
  HydratedPipelineHistoryEntry,
  PipelineDefinition
} from "./genericIssuanceTypes";
import { GenericPretixEvent, GenericPretixProduct } from "./genericPretixTypes";

/**
 * Ask the server to prove a PCD. The server reponds with a {@link PendingPCD}
 */
export interface ServerProofRequest<T extends PCDPackage = PCDPackage> {
  pcdType: string;
  args: ArgsOf<T>;
}

/**
 * Ask the server for the status of a queued server-side proof.
 */
export interface ProofStatusRequest {
  hash: string;
}

/**
 * The server's response to a {@link ProofStatusRequest}.
 */
export interface ProofStatusResponseValue {
  status: PendingPCDStatus;

  /**
   * If status === COMPLETE, JSON.stringify(SerializedPCD), else undefined
   */
  serializedPCD: string | undefined;

  /**
   * If status === ERROR, error string from server, else undefined;
   */
  error: string | undefined;
}

/**
 * Ask the server what sorts of proofs it's able to instantiate for users.
 */
export interface SupportedPCDsResponseValue {
  names: string[];
}

/**
 * Ask the server to save e2ee a user's PCDs and other metadata.
 */
export interface UploadEncryptedStorageRequest {
  /**
   * On the server-side, encrypted storage is keyed by the hash of
   * the user's encryption key.
   */
  blobKey: string;

  /**
   * An encrypted and stringified version of {@link EncryptedStorage}
   */
  encryptedBlob: string;

  /**
   * Optional field allowing the client to detect and avoid conflicting
   * updates.
   *
   * If specified, this is the previous revision of stored data which the
   * client is aware of and has included in its updates.  If this does not match
   * the latest revision available on the server, the request will fail without
   * making any changes.
   *
   * If this field is absent, the new blob is always saved, overwriting any
   * existing revision.
   */
  knownRevision?: string;

  pcd?: SerializedPCD;
}

/**
 * Response to {@link UploadEncryptedStorageRequest}
 */
export interface UploadEncryptedStorageResponseValue {
  /**
   * The revision assigned to identify the stored blob.  Revision is assigned by
   * the server and can be used later to identify this blob and avoid conflicts.
   */
  revision: string;
}

/**
 * Ask the server for an e2ee backup of a user's data given a `blobKey`.
 */
export interface DownloadEncryptedStorageRequest {
  /**
   * On the server-side, encrypted storage is keyed by the hash of
   * the encryption key.
   */
  blobKey: string;

  /**
   * Optional field indicating the revision of the latest blob already known to
   * the client.  If this matches the latest blob stored on the server, the
   * request will succeed, but the result will not contain any blob.
   */
  knownRevision?: string;
}

/**
 * Response to {@link DownloadEncryptedStorageRequest}
 */
export interface DownloadEncryptedStorageResponseValue {
  /**
   * The retrieved blob for the given key.  This will be absent if the request
   * included a `knownRevision` which matched the latest revision.
   */
  encryptedBlob?: string;

  /**
   * The revision identifying this blob on the server.  Revision is assigned by
   * the server and can be used later to identify this blob and avoid conflicts.
   */
  revision: string;
}

/**
 * Ask the server to change the salt, delete the storage at the old blob key,
 * and add a new encrypted storage entry encrypted with the new blob key.
 */
export interface ChangeBlobKeyRequest {
  /**
   * The original hashed encryption key to be deleted.
   */
  oldBlobKey: string;

  /**
   * The new hashed encryption key to be added.
   */
  newBlobKey: string;

  /**
   * UUID of the user making the request.
   */
  uuid: string;

  /**
   * The salt used in generating the new blob key.
   */
  newSalt: string;

  /**
   * The encrypted and stringified version of {@link EncryptedStorage} to save
   */
  encryptedBlob: string;

  /**
   * Optional field allowing the client to detect and avoid conflicting
   * updates.
   *
   * If specified, this is the previous revision of stored data which the
   * client is aware of and has included in its updates.  If this does not match
   * the latest revision available on the server, the request will fail without
   * making any changes.
   *
   * If this field is absent, the new blob is always saved, overwriting any
   * existing revision.
   */
  knownRevision?: string;

  /**
   * Signature PCD by the user who is changing the blob key.  This is used to
   * associate the e2ee storage with the user's identity.
   */
  pcd?: SerializedPCD<SemaphoreSignaturePCD>;
}

/**
 * Response to {@link ChangeBlobKeyRequest}
 */
export interface ChangeBlobKeyResponseValue {
  /**
   * The revision assigned to identify the stored blob.  Revision is assigned by
   * the server and can be used later to identify this blob and avoid conflicts.
   */
  revision: string;
}

/**
 * A {@link ChangeBlobKeyRequest} can fail with a few non-standard named errors:
 * PasswordIncorrect if there is no blob for the given key
 * UserNotFound if the user does not exist
 * RequiresNewSalt if the given salt is the same as the old salt
 * Conflict if knownRevision is specified and doesn't match
 */
export type ChangeBlobKeyError = NamedAPIError;

/**
 * Ask the server to check whether this ticket is still eligible to be checked in.
 */
export interface CheckTicketRequest {
  ticket: SerializedPCD<EdDSATicketPCD>;
  signature: Credential;
}

/**
 * Happy-path the server has nothing to say in response to a {@link CheckTicketRequest}
 */
export type CheckTicketReponseValue = undefined;

/**
 * Ask the server to check whether this ticket is still eligible to be checked
 * in, after looking it up by ticket ID.
 */
export interface CheckTicketByIdRequest {
  ticketId: string;
  signature: Credential;
}

/**
 * Response to a {@link CheckTicketByIdRequest} is a subset of {@link ITicketData}
 * required for DevconnectCheckinByIdScreen.tsx
 */
export type CheckTicketByIdResponseValue = {
  attendeeName: string;
  attendeeEmail: string;
  eventName: string;
  ticketName: string;
};

/**
 * However, many problems can come up in {@link CheckTicketRequest}
 * and {@link CheckTicketByIdRequest}. This type enumerates all the possible
 * problems.
 */
export type TicketError = { detailedMessage?: string } & (
  | { name: "NotSuperuser" }
  | {
      name: "AlreadyCheckedIn";
      checkinTimestamp: string | undefined;
      checker: string | undefined;
    }
  | { name: "InvalidSignature" }
  | { name: "InvalidTicket" }
  | { name: "TicketRevoked"; revokedTimestamp: number }
  | { name: "NetworkError" }
  | { name: "ServerError" }
);

/**
 * A particular 'superuser' ticket-holder can request to check in
 * another ticket that belongs to the same event.
 */
export interface CheckTicketInRequest {
  /**
   * A semaphore signature from the checker, used by the server to
   * determine whether the checker has the required permissions
   * to check this ticket in.
   */
  checkerProof: Credential;

  /**
   * The ticket to attempt to check in.
   */
  ticket: SerializedPCD<EdDSATicketPCD>;
}

/**
 * On the happy path, {@link CheckTicketInRequest} has nothing to say and
 * just succeeds.
 */
export type CheckTicketInResponseValue = undefined;

/**
 * A {@link CheckTicketInRequest} can fail for a number of reasons.
 */
export type CheckTicketInError = TicketError;

/**
 * A particular 'superuser' ticket-holder can request to check in
 * another ticket that belongs to the same event, by referencing the ID
 * of the ticket.
 */
export interface CheckTicketInByIdRequest {
  /**
   * A semaphore signature from the checker, used by the server to
   * determine whether the checker has the required permissions
   * to check this ticket in.
   */
  checkerProof: Credential;

  /**
   * The ticket ID to attempt to check in.
   */
  ticketId: string;
}

/**
 * On the happy path, {@link CheckTicketInByIdRequest} has nothing to say and
 * just succeeds.
 */
export type CheckTicketInByIdResponseValue = undefined;

/**
 * A {@link CheckTicketInByIdRequest} can fail for a number of reasons.
 */
export type CheckTicketInByIdError = TicketError;

/**
 * When verifying scanned PCDs, we want to check with the server, which
 * knows about public keys when the client does not.
 */
export interface VerifyTicketRequest {
  /**
   * A PCD to verify. JSON-encoded {@link SerializedPCD}.
   */
  pcd: string;
}

/**
 * Supported ticket groups for known tickets. This is based on pattern-matching
 * of event ID, product ID, and signing key.
 */
export const enum KnownTicketGroup {
  Devconnect23 = "Devconnect23",
  Zuzalu23 = "Zuzalu23",
  Zuconnect23 = "Zuconnect23",
  Other = "Other"
}

/**
 * Result of verification, and name of the public key if recognized.
 */
export type VerifyTicketResponseValue =
  | {
      verified: true;
      publicKeyName: string;
      group: KnownTicketGroup;
      eventName: string;
    }
  | {
      verified: false;
      message?: string;
    };

/**
 * Verifies a ticket by ticket ID and timestamp.
 * See also {@link VerifyTicketRequest}
 */
export interface VerifyTicketByIdRequest {
  /**
   * The ID of an EdDSATicketPCD.
   */
  ticketId: string;
  /**
   * A timestamp, in milliseconds since midnight January 1 1970.
   */
  timestamp: string;
}

export type VerifyTicketByIdResponseValue =
  | {
      verified: true;
      publicKeyName: string;
      group: KnownTicketGroup;
      productId: string;
      ticketName?: string;
      eventName: string;
    }
  | {
      verified: false;
      message?: string;
    };

/**
 * Ask the Zupass server, or a 3rd party server to return the list of feeds
 * that it is hosting.
 */
export type ListFeedsRequest = unknown;

/**
 * Response to {@link ListFeedsRequest}.
 */
export interface ListFeedsResponseValue {
  providerUrl: string;
  providerName: string;
  feeds: Feed[];
}

export interface PipelineFeedInfo {
  name: string;
  url: string;
  // TODO: checkin url
}

export enum PipelineLogLevel {
  Info = "Info",
  Warning = "Warning",
  Error = "Error"
}

export interface PipelineSemaphoreGroupInfo {
  name: string;
  groupId: string;
  memberCount: number;
  url: string;
}

export interface PipelineLoadSummary {
  fromCache: boolean;
  paused: boolean;
  lastRunStartTimestamp: string;
  lastRunEndTimestamp: string;
  latestLogs: PipelineLog[];
  atomsLoaded: number;
  atomsExpected: number;
  success: boolean;
  errorMessage?: string;
  semaphoreGroups?: PipelineSemaphoreGroupInfo[];
}

export interface PipelineLog {
  timestampCreated: string;
  level: PipelineLogLevel;
  value: string;
  metadata: unknown;
}

export interface PipelineInfoRequest {
  jwt: string;
  pipelineId: string;
}

export interface PipelineInfoConsumer {
  email: string;
  commitment: string;
  timeCreated: string;
  timeUpdated: string;
}

export interface PipelineSetManualCheckInStateRequest {
  ticketId: string;
  checkInState: boolean;
}

export interface PipelineSetManualCheckInStateResponseValue {
  checkInState: boolean;
}

export interface PipelineCheckinSummary {
  ticketId: string;
  ticketName: string;
  email: string;
  timestamp: string;
  checkerEmail?: string | undefined;
  checkedIn: boolean;
}

export interface PipelineGetManualCheckInsResponseValue {
  checkIns: PipelineCheckinSummary[];
}

export interface PipelineEdDSATicketZuAuthConfig {
  pcdType: typeof EdDSATicketPCDTypeName;
  publicKey: EdDSAPublicKey;
  eventId: string; // UUID
  eventName: string;
  productId?: string; // UUID
  productName?: string;
}

// could be |'ed with other types of metadata
export type PipelineZuAuthConfig = PipelineEdDSATicketZuAuthConfig;

export interface PipelineInfoResponseValue {
  ownerEmail: string;
  loading: boolean;
  hasCachedLoad: boolean;
  cachedBytes: number;
  lastLoad?: PipelineLoadSummary;
  feeds?: PipelineFeedInfo[];
  latestAtoms?: object[];
  latestConsumers?: PipelineInfoConsumer[];
  editHistory?: HydratedPipelineHistoryEntry[];
  zuAuthConfig?: PipelineZuAuthConfig[];
  smallVersion?: boolean;
}

export interface ListSingleFeedRequest {
  feedId: string;
}

/**
 * Ask the Zupass server, or a 3rd party server, to give the user
 * some PCDs, given the particular feed and credential that the
 * user supplies.
 */
export interface PollFeedRequest<T extends PCDPackage = PCDPackage> {
  feedId: string;
  pcd?: SerializedPCD<PCDOf<T>>;
}

/**
 * Response to {@link PollFeedRequest}.
 */
export interface PollFeedResponseValue {
  actions: PCDAction[];
}

/**
 * The Zupass server returns this data structure to users
 * to represent Zupass users.
 */
export interface ZupassUserJson {
  uuid: string;
  /**
   * Semaphore v3 commitment.
   */
  commitment: string;
  semaphore_v4_commitment?: string | null;
  semaphore_v4_pubkey?: string | null;
  emails: string[];
  salt: string | null;
  terms_agreed: number;
}

/**
 * Ask the Zupass server to send a confirmation email with a
 * log-in token to the given email.
 */
export type ConfirmEmailRequest = {
  /**
   * Each email can have one account on Zupass.
   */
  email: string;

  /**
   * Whether or not to overwrite an existing user, if one is present.
   * Required to be 'true' if a user with the same email already exists.
   */
  force: "true" | "false";
};

/**
 * Response to {@link ConfirmEmailRequest}
 */
export type ConfirmEmailResponseValue =
  | {
      /**
       * In development mode, the server can return a token
       * to the client rather than sending it via an email,
       * speeding up software development iteration. Check
       * out the `BYPASS_EMAIL_REGISTRATION` environment variable
       * elsewhere in this codebase to learn more.
       */
      devToken: string;
    }
  | undefined;

/**
 * Ask the Zupass server for the salt of a particular user.
 */
export type SaltRequest = { email: string };

/**
 * Response to {@link SaltRequest}.
 */
export type SaltResponseValue = string | null;

/**
 * Ask the server to let us know if the given token is valid and
 * OK to use for logging in / overwriting an existing account.
 */
export type VerifyTokenRequest = {
  email: string;
  token: string;
};

/**
 * Returns the encryption_key of the account, if the user has opted to not set
 * a password and store their encryption key on our server.
 * {@link VerifyTokenRequest}.
 */
export type VerifyTokenResponseValue = {
  encryptionKey: string | null;
};

/**
 * Ask the server to log us in using a special login flow designed
 * for use by the coworking space organizers.
 */
export type DeviceLoginRequest = {
  email: string;
  secret: string;
  commitment: string;
};

/**
 * Ask the Zupass server to create a new account with
 * the given details, overwriting an existing account if one is
 * present.
 */
export type CreateNewUserRequest = {
  email: string;
  token: string;
  /**
   * Semaphore v3 commitment.
   */
  commitment: string;
  /**
   * Semaphore v4 public key.
   */
  semaphore_v4_pubkey: string;
  salt: string | undefined;
  encryptionKey: string | undefined;
  autoRegister?: boolean;
};

/**
 * Asks the Zupass server to add a user's semaphore v4 commitment to their existing account.
 */
export type UpgradeUserWithV4CommitmentRequest = {
  /**
   * semaphore v3 signature of semaphore v4 signature (i.e. a POD) of v3 commitment
   * created by `makeUpgradeUserWithV4CommitmentRequest`
   */
  pcd: SerializedPCD<SemaphoreSignaturePCD>;
};

export type UpgradeUserWithV4CommitmentResponseValue = undefined;

export type OneClickLoginRequest = {
  email: string;
  code: string;
  /**
   * Semaphore v3 commitment.
   */
  commitment: string;
  /**
   * We don't need the v4 commitment here as it is deriveable from the v4 pubkey.
   */
  semaphore_v4_pubkey: string;
  encryptionKey: string;
};

export type OneClickLoginResponseValue =
  | { isNewUser: true; zupassUser: ZupassUserJson }
  | { isNewUser: false; encryptionKey: string | null };

/**
 * Zupass responds with this when you ask it if it is able to
 * issue tickets. Used primarily for testing.
 */
export type IssuanceEnabledResponseValue = boolean;

/**
 * Zupass responds with this when you ask it whether it has
 * synced the Zuzalu users yet.
 */
export type PretixSyncStatusResponseValue = string;

/**
 * In the case that loading an existing Zupass user fails,
 * we can determine if it failed because the user does not exist,
 * or due to some other error, such as intermittent network error,
 * or the backend being down.
 */
export type LoadUserError =
  | { userMissing: true; errorMessage?: never }
  | { userMissing?: never; errorMessage: string };

/**
 * When you ask Zupass for a user, it will respond with this type.
 */
export type UserResponseValue = ZupassUserJson;

/**
 * When you ask Zupass to create a new user, it will respond with this type.
 */
export type NewUserResponseValue = ZupassUserJson;

/**
 * Zupass responds with this when you ask it if it knows of a given
 * (id, rootHash) tuple.
 */
export type SemaphoreValidRootResponseValue = { valid: boolean };

/**
 * For known tickets, this is the type of the public key.
 * Possibly this information is redundant, but it seems useful to be
 * explicit about the type of key used.
 */
export const enum KnownPublicKeyType {
  EdDSA = "eddsa",
  RSA = "rsa"
}

/**
 * Known ticket types, describing the attributes of a ticket that
 * belongs to a group.
 */
export interface KnownTicketType {
  eventId: string;
  productId: string;
  publicKey: EdDSAPublicKey;
  publicKeyName: string;
  publicKeyType: KnownPublicKeyType;
  ticketGroup: KnownTicketGroup;
}

/**
 * Known public keys, with a name and type to enable them to be
 * identified in relation to known ticket types.
 */
export type KnownPublicKey =
  | {
      publicKeyName: string;
      publicKeyType: "eddsa";
      publicKey: EdDSAPublicKey;
    }
  | {
      publicKeyName: string;
      publicKeyType: "rsa";
      publicKey: string;
    };

export interface KnownTicketTypesAndKeys {
  knownTicketTypes: KnownTicketType[];
  publicKeys: KnownPublicKey[];
}

/**
 * Zupass responds with this when you ask it for the details of known
 * ticket types.
 */
export type KnownTicketTypesResponseValue = KnownTicketTypesAndKeys;

export type KnownTicketTypesRequest = undefined;

/**
 * The version of the legal terms being agreed to.
 */
export interface AgreeTermsPayload {
  version: number;
}

/**
 * When a user agrees to new legal terms, they send us a signed proof.
 */
export interface AgreeTermsRequest {
  pcd: SerializedPCD<SemaphoreSignaturePCD>;
}

export interface DeleteAccountRequest {
  pcd: SerializedPCD<SemaphoreSignaturePCD>;
}

/**
 * After the user agrees to the terms, respond with the terms version recorded.
 */
export interface AgreeToTermsResponseValue {
  version: number;
}

/**
 * The string the client must sign with the user's semaphore identity
 * in order to be able to request the PCDs that the server wants to
 * issue the user.
 */
export const ISSUANCE_STRING = "Issue me PCDs please.";

/**
 * User requests about
 * 1. for the feeds they are subscribed to, when they can get next frog and
 *    whether it is active
 * 2. how many frogs in Frogedex
 *
 * NB: The number of possible frogs are currently not user specific. It is
 * possible that we will introduce series unlock in the future where the number
 * of possible frogs will be user specific.
 */
export interface FrogCryptoUserStateRequest {
  pcd: Credential;
  feedIds: string[];
}

/**
 * Individual feed level response to {@link FrogCryptoUserStateRequest}
 */
export interface FrogCryptoComputedUserState {
  feedId: string;
  lastFetchedAt: number;
  nextFetchAt: number;
  active: boolean;
}

/**
 * Response to {@link FrogCryptoUserStateRequest}
 */
export interface FrogCryptoUserStateResponseValue {
  feeds: FrogCryptoComputedUserState[];
  /**
   * A list of possible frogs
   */
  possibleFrogs: DexFrog[];
  myScore?: FrogCryptoScore;
}

/**
 * Request to reveal or redact telegram handle of a user on the leaderboard.
 */
export interface FrogCryptoShareTelegramHandleRequest {
  pcd: Credential;
  reveal: boolean;
}

/**
 * Response to {@link FrogCryptoShareTelegramHandleRequest}
 */
export interface FrogCryptoShareTelegramHandleResponseValue {
  myScore: FrogCryptoScore;
}

/**
 * Admin request to manage frogs in the databse.
 */
export type FrogCryptoUpdateFrogsRequest = {
  pcd: Credential;
  /**
   * Pass empty array for no-op and return all frogs.
   */
  frogs: FrogCryptoFrogData[];
};

/**
 * Response to {@link FrogCryptoUpdateFrogsRequest} and returns all frogs.
 */
export interface FrogCryptoUpdateFrogsResponseValue {
  frogs: FrogCryptoFrogData[];
}

/**
 * Admin request to delete frogs in the databse.
 */
export type FrogCryptoDeleteFrogsRequest = {
  pcd: Credential;
  frogIds: number[];
};

/**
 * Response to {@link FrogCryptoDeleteFrogsRequest} and returns all remaining frogs.
 */
export interface FrogCryptoDeleteFrogsResponseValue {
  frogs: FrogCryptoFrogData[];
}

/**
 * Admin request to manage feeds in the databse.
 */
export type FrogCryptoUpdateFeedsRequest = {
  pcd: Credential;
  /**
   * Pass empty array for no-op and return all feeds.
   */
  feeds: FrogCryptoDbFeedData[];
};

/**
 * Response to {@link FrogCryptoUpdateFeedsRequest} and returns all feeds.
 */
export interface FrogCryptoUpdateFeedsResponseValue {
  feeds: FrogCryptoDbFeedData[];
}

/*
 * Many problems can come up in {@link GenericIssuanceCheckInRequest}
 * and {@link GenericIssuanceCheckRequest}. This type enumerates all the possible
 * problems.
 */
export type PodboxTicketActionError = { detailedMessage?: string } & (
  | { name: "NotSuperuser" }
  | { name: "NoActionsAvailable" }
  | {
      name: "AlreadyCheckedIn";
      checkinTimestamp: string;
      checker: string | undefined;
    }
  | { name: "InvalidSignature" }
  | { name: "InvalidTicket" }
  | { name: "AlreadyReceived" }
  | { name: "TicketRevoked"; revokedTimestamp: number }
  | { name: "NetworkError" }
  | { name: "ServerError" }
);

/**
 * Request body for hitting the Podbox action API on the backend.
 */
export type PodboxTicketActionRequest = {
  /**
   * This is a semaphore signature of a {@link CredentialPayload},
   * signed using the Zupass Semaphore identity of the user who has a ticket
   * that the user claims grants them the permission to check tickets issued
   * by the generic issuance service in.
   */
  credential: Credential;

  /**
   * The action a member of a pipeline wants to take.
   */
  action: PodboxTicketAction;

  /*
   * The ticket and event that are the targets of the action.
   */
  ticketId: string;
  eventId: string;
};

/**
 * Checking in either succeeds or fails, so no response value is defined for now.
 */
export type PodboxTicketActionResponseValue =
  | {
      success: true;
      error?: never;
    }
  | {
      success: false;
      error: PodboxTicketActionError;
    };

/**
 * This is a "pre-checkin" step, which verifies that the user is able to check
 * the ticket in, before allowing them to attempt to do so.
 */
export type PodboxTicketActionPreCheckRequest = {
  /**
   * This is a semaphore signature of a {@link CredentialPayload},
   * signed using the Zupass Semaphore identity of the user who has a ticket
   * that the user claims grants them the permission to check tickets issued
   * by the generic issuance service in.
   */
  credential: Credential;

  /**
   * The action a member of a pipeline wants to take.
   */
  action: PodboxTicketAction;

  /*
   * The ID of the ticket to be checked in.
   */
  ticketId: string;

  /**
   * The ID of the event that the ticket belongs to.
   */
  eventId: string;
};

export type Badge = {
  id: string;
  timeCreated: number;
  giver: string;
};

export interface TicketInfo {
  attendeeName: string;
  attendeeEmail: string;
  ticketName: string;
  eventName: string;
}

export interface GetContactActionInfo {
  permissioned: boolean;
  alreadyReceived: boolean;
  ticket?: TicketInfo;
}

export type CheckinActionInfo =
  | {
      permissioned: true;
      canCheckIn: true;
      ticket: TicketInfo;
      reason?: never;
    }
  | {
      permissioned: false;
      canCheckIn: false;
      ticket?: TicketInfo;
      reason?: PodboxTicketActionError;
    }
  | {
      permissioned: true;
      canCheckIn: false;
      ticket?: TicketInfo;
      reason?: PodboxTicketActionError;
    };

export type RateLimitedBadge = {
  id: string;
  eventName: string;
  productName?: string;
  alreadyGivenInInterval: number;
  maxInInterval: number;
  intervalMs: number;
  timestampsGiven: number[];
};

export function isPerDayBadge(
  badge: BadgeConfig
): badge is BadgeConfig & { maxPerDay: number } {
  return badge.maxPerDay !== undefined;
}

export type GiveBadgeActionInfo = {
  permissioned: boolean;
  giveableBadges: BadgeConfig[];
  rateLimitedBadges?: RateLimitedBadge[];
  ticket: TicketInfo;
};

export type ActionConfigResponseValue =
  | {
      success: true;
      getContactActionInfo?: GetContactActionInfo;
      giveBadgeActionInfo?: GiveBadgeActionInfo;
      checkinActionInfo?: CheckinActionInfo;
      actionScreenConfig?: ActionScreenConfig;
    }
  | {
      success: false;
      error: PodboxTicketActionError;
      ticketInfo?: never;
      getContactActionInfo?: never;
      giveBadgeActionInfo?: never;
      checkinActionInfo?: never;
      actionScreenConfig?: never;
    };

/**
 * Sending email either succeeds or fails, so no response value is defined for now.
 */
export type GenericIssuanceSendEmailResponseValue = undefined;

export type GenericIssuanceGetAllUserPipelinesRequest = { jwt: string };

/**
 * Returns all pipeline definitions that a user has access to.
 */
export type GenericIssuanceGetAllUserPipelinesResponseValue =
  GenericIssuancePipelineListEntry[];

export type GenericIssuancePipelineListEntry = {
  pipeline: PipelineDefinition;
  extraInfo: {
    ownerEmail?: string;
    hasCachedLoad: boolean;
    loading: boolean;
    lastLoad?: PipelineLoadSummary;
    feeds?: PipelineFeedInfo[];
    latestAtoms?: object[];
  };
};

/**
 * Returns the requested pipeline definition.
 */
export type GenericIssuanceGetPipelineResponseValue = PipelineDefinition;

export type GenericIssuanceGetPipelineRequest = { jwt: string };

/**
 * Request body containing the pipeline definition to be upserted.
 */
export type GenericIssuanceUpsertPipelineRequest = {
  pipeline: PipelineDefinition;
  jwt: string;
};

/**
 * Request body containing the pipeline id whose cache should be cleared.
 */
export type GenericIssuanceClearPipelineCacheRequest = {
  pipelineId: string;
  jwt: string;
};

/**
 * Returns the upserted pipeline definition.
 */
export type GenericIssuanceUpsertPipelineResponseValue = PipelineDefinition;

/**
 * Deleting a pipeline definition either succeeds or fails, so no response value is defined for now.
 */
export type GenericIssuanceDeletePipelineResponseValue = void;

export type GenericIssuanceDeletePipelineRequest = { jwt: string };

export type GenericIssuanceFetchPretixEventsRequest = {
  orgUrl: string;
  token: string;
  jwt: string;
};

export type GenericIssuanceFetchPretixEventsResponseValue =
  GenericPretixEvent[];

export type GenericIssuanceFetchPretixProductsRequest = {
  orgUrl: string;
  token: string;
  eventID: string;
  jwt: string;
};

export type GenericIssuanceFetchPretixProductsResponseValue =
  GenericPretixProduct[];

export type GenericIssuanceSelf = {
  email: string;
  isAdmin: boolean;
  id: string;
};

export type GenericIssuanceSelfResponseValue = GenericIssuanceSelf;

export type GenericIssuanceSelfRequest = { jwt: string };

export type GenericIssuanceSemaphoreGroupResponseValue =
  SerializedSemaphoreGroup;

export type GenericIssuanceHistoricalSemaphoreGroupResponseValue =
  SerializedSemaphoreGroup;

export type GenericIssuancePipelineSemaphoreGroupsResponseValue =
  PipelineSemaphoreGroupInfo[];

export type GenericIssuanceValidSemaphoreGroupResponseValue = {
  valid: boolean;
};

export type GenericIssuanceSemaphoreGroupRootResponseValue = string;

export const enum PipelineEmailType {
  EsmeraldaOneClick = "EsmeraldaOneClick"
}

export type GenericIssuanceSendPipelineEmailRequest = {
  jwt: string;
  pipelineId: string;
  email: PipelineEmailType;
};

export type GenericIssuanceSendPipelineEmailResponseValue = {
  queued: number;
};

export enum EmailUpdateError {
  InvalidCredential = "InvalidCredential",
  InvalidConfirmationCode = "InvalidConfirmationCode",
  EmailAlreadyRegistered = "EmailAlreadyRegistered",
  CantDeleteOnlyEmail = "CantDeleteOnlyEmail",
  CantChangeWrongOldEmail = "CantChangeWrongOldEmail",
  CantChangeWhenMultipleEmails = "CantChangeWhenMultipleEmails",
  EmailNotAssociatedWithThisAccount = "EmailNotAssociatedWithThisAccount",
  UserNotFound = "UserNotFound",
  InvalidInput = "InvalidInput",
  TooManyEmails = "TooManyEmails",
  Unknown = "Unknown"
}

export interface AddUserEmailRequest {
  newEmail: string;

  /**
   * A semaphore signature from the user, used to verify their identity.
   */
  pcd: SerializedPCD<SemaphoreSignaturePCD>;

  /**
   * If absent, requests a confirmation code; if present, redeems it.
   */
  confirmationCode?: string;
}

export type AddUserEmailResponseValue =
  | {
      sentToken: false;
      token?: never;
      newEmailList: string[];
    }
  | { sentToken: true; token?: string; newEmailList?: never };

export interface ChangeUserEmailRequest {
  oldEmail: string;
  newEmail: string;

  /**
   * A semaphore signature from the user, used to verify their identity.
   */
  pcd: SerializedPCD<SemaphoreSignaturePCD>;

  /**
   * If absent, requests a confirmation code; if present, redeems it.
   */
  confirmationCode?: string;
}

export type ChangeUserEmailResponseValue =
  | {
      sentToken: false;
      token?: never;
      newEmailList: string[];
    }
  | { sentToken: true; token?: string; newEmailList?: never };

export interface RemoveUserEmailRequest {
  emailToRemove: string;

  /**
   * A semaphore signature from the user, used to verify their identity.
   */
  pcd: SerializedPCD<SemaphoreSignaturePCD>;
}

export type RemoveUserEmailResponseValue = {
  newEmailList: string[];
};

export type OneClickEmailResponseValue = {
  /**
   * Hashed email -> hashed pretix order codes
   */
  values: Record<string, string[]>;
};

export type TicketPreviewResultValue = {
  tickets: Array<IPODTicketData>;
};
