import { Zapp } from "@parcnet-js/client-rpc";
import {
  CredentialCache,
  FeedSubscriptionManager,
  KnownPublicKey,
  KnownTicketType,
  PCDGetRequest,
  User
} from "@pcd/passport-interface";
import { PCDCollection } from "@pcd/pcd-collection";
import { PCD } from "@pcd/pcd-types";
import { IdentityV3 } from "@pcd/semaphore-identity-pcd";
import { TicketType } from "../new-components/screens/Home/types";
import { EmbeddedScreenState } from "./embedded";
import { Emitter } from "./emitter";
import { ListenMode } from "./zapp/useZappServer";
export type GetState = () => AppState;
export type StateEmitter = Emitter<AppState>;

export interface AppState {
  /**
   * Semaphore v3 identity. A v4 identity can be derived from this value using
   * the function `v3tov4Identity`.
   */
  identityV3: IdentityV3;
  pcds: PCDCollection;
  subscriptions: FeedSubscriptionManager;
  pauseSync?: boolean;
  encryptionKey?: string;
  credentialCache: CredentialCache;

  // bottom modal will deprecate modal
  bottomModal:
    | {
        modalType: "pods-collection";
        activePod?: PCD<unknown, unknown>;
        idType?: "ticketId" | "id";
      }
    | { modalType: "settings" }
    | { modalType: "change-password" }
    | { modalType: "another-device-changed-password" }
    | { modalType: "invalid-participant" }
    | { modalType: "success-modal"; title: string; description: string }
    | { modalType: "about" }
    | { modalType: "import" }
    | { modalType: "prove"; request: PCDGetRequest }
    | { modalType: "manage-emails" }
    | { modalType: "delete-account" }
    | { modalType: "ticket-add-ons"; addOns: TicketType[] }
    | { modalType: "help-modal" }
    | { modalType: "none" };

  // View state
  modal:
    | { modalType: "info" }
    | { modalType: "settings" }
    | { modalType: "invalid-participant" }
    | { modalType: "changed-password" }
    | { modalType: "another-device-changed-password" }
    | { modalType: "resolve-subscription-error" }
    | { modalType: "privacy-notice" }
    | { modalType: "none" }
    | {
        modalType: "frogcrypto-update-telegram";
        revealed: boolean;
        refreshAll: () => Promise<void>;
      }
    | { modalType: "frogcrypto-export-pcds" };

  scrollTo?: {
    attendee: string;
    eventId: string;
  };

  // stores the eligibility state of all pcd type props that that the prove has,
  // if one is not valid, we show a full screen error stat
  proveStateEligiblePCDs?: boolean[];
  self?: User; // User metadata.

  // if the client is in the process of logging out,
  // shows alternate UI on the login page to prevent
  // user confusion
  loggingOut?: boolean;

  // if the client is in the process of deleting their account,
  // shows alternate UI in passport to prevent user interaction
  // until the operatoin is complete or fails
  deletingAccount?: boolean;

  // If set, shows an error popover.
  error?: AppError;

  // If set, show the error resolution screen for this subscription
  resolvingSubscriptionId?: string;

  // If set, the user has been invalidated server-side
  userInvalid?: boolean;
  // If set, the user has had their password changed from a different device
  anotherDeviceChangedPassword?: boolean;

  // Dynamic (in-memory-only) state-machine for sync of E2EE encrypted data.
  // The background sync will always perform all steps (download, fetch feeds,
  // upload) on its initial run, after which it will repeat each step only
  // when requested (for download and feeds), or when the hash of stored
  // state changes (for upload).
  // TODO(artwyman): The parts of this not needed by the rest of the app
  // might be better stored elsewhere, to avoid issues with reentrancy
  // and stale snapshots delivered via dispatch().

  // (Dynamic sync state) Output variable indicating whether the first attempt
  // to download from E2EE storage has completed (whether success or failure).
  // Also used within the sync engine to avoid repeating this attempt.
  downloadedPCDs?: boolean;

  // (Dynamic sync state) Output variable indicating whether the first attempt
  // to fetch PCDs from subscription feeds has completed (whether success or
  // failure).
  // Also used within the sync engine to avoid repeating this attempt.
  loadedIssuedPCDs?: boolean;

  // (Dynamic sync state) Output variable indicating when a fetch from
  // subscription feeds is in progress.
  // Only used to update UI, not to control the behavior of the sync itself.
  loadingIssuedPCDs?: boolean;

  // (Dynamic sync state) Output variable indicating when all stages of the
  // initial sync are complete.
  // Also used within the sync engine so that the behavior of future syncs
  // differs from the first.
  completedFirstSync?: boolean;

  // (Dynamic sync state) Input variable to indicate to the sync engine that
  // it should download again.  Will trigger at most one download, after which
  // it will be set back to false (whether the download succeeded or failed).
  extraDownloadRequested?: boolean;

  // (Dynamic sync state) Input variable to indicate to the sync engine that
  // it should fetch subscription feeds again.  Will trigger at most one fetch,
  // after which it will be set back to false (whether the fetch succeeded or
  // failed).
  extraSubscriptionFetchRequested?: boolean;

  // Persistent sync state-machine fields, saved in local storage as a
  // PersistentSyncStatus object.  This is structured to allow for more
  // fields to be added later.

  // (Persistent sync state) The revision (assigned by the server) of the most
  // recent storage uploaded or downloaded.  Represents the most recent
  // point where we know our state was the same as the server.
  serverStorageRevision?: string;

  // (Persistent sync state) The hash (calculated by the client) of the most
  // recent storage uploaded or downloaded.  Represents the most recent
  // point where we know our state was the same as the server.
  serverStorageHash?: string;

  knownTicketTypes?: KnownTicketType[];
  knownPublicKeys?: Record<string, Record<string, KnownPublicKey>>;

  offline: boolean;

  // @todo screen-specific data should perhaps have a structure similar to
  // that of modals
  importScreen?: {
    imported?: number;
    error?: string;
  };

  // If we're showing a screen in an embedded iframe or a dialog above an
  // embedded Zapp, the state of that screen.
  embeddedScreen?: EmbeddedScreenState;

  // When we're connected to a zapp, the zapp and its origin
  connectedZapp?: Zapp;
  zappOrigin?: string;

  // Whether the user has approved the zapp
  zappApproved?: boolean;

  // Whether the client is listening for zapps in embedded mode
  listenMode?: ListenMode;
}

export interface AppError {
  /** Big title, should be under 40 chars */
  title: string;
  /** Useful explanation, avoid "Something went wrong." */
  message: string | React.ReactNode;
  /** Optional stacktrace. */
  stack?: string;
  /** By default, user dismisses an error and returns to home screen. */
  dismissToCurrentPage?: boolean;
}
