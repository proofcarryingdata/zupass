import {
  CredentialCache,
  FeedSubscriptionManager,
  KnownPublicKey,
  KnownTicketType,
  OfflineDevconnectTicket,
  OfflineTickets,
  User
} from "@pcd/passport-interface";
import { PCDCollection } from "@pcd/pcd-collection";
import { Identity } from "@semaphore-protocol/identity";
import React from "react";
import { Emitter } from "./emitter";

export type GetState = () => AppState;
export type StateEmitter = Emitter<AppState>;

export interface AppState {
  // Zuzalu semaphore identity.
  identity: Identity;
  pcds: PCDCollection;
  subscriptions: FeedSubscriptionManager;
  encryptionKey?: string;
  credentialCache: CredentialCache;

  // View state
  modal:
    | { modalType: "info" }
    | { modalType: "settings" }
    | { modalType: "upgrade-account-modal" }
    | { modalType: "invalid-participant" }
    | { modalType: "changed-password" }
    | { modalType: "another-device-changed-password" }
    | { modalType: "resolve-subscription-error" }
    | { modalType: "confirm-setup-later"; onConfirm: () => void }
    | { modalType: "require-add-password" }
    | { modalType: "none" };

  // User metadata.
  self?: User;

  // If set, shows an error popover.
  error?: AppError;

  // If set, show the error resolution screen for this subscription
  resolvingSubscriptionId: string;

  // If set, the user has been invalidated server-side
  userInvalid?: boolean;
  // If set, the user has had their password changed from a different device
  anotherDeviceChangedPassword?: boolean;

  uploadedUploadId?: string;
  uploadingUploadId?: string;
  downloadedPCDs?: boolean;
  downloadingPCDs?: boolean;
  loadedIssuedPCDs?: boolean;
  loadingIssuedPCDs?: boolean;

  knownTicketTypes?: KnownTicketType[];
  knownPublicKeys?: Record<string, Record<string, KnownPublicKey>>;

  offlineTickets: OfflineTickets;
  checkedinOfflineDevconnectTickets: OfflineDevconnectTicket[];
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
