import { ZuParticipant } from "@pcd/passport-interface";
import { PCDCollection } from "@pcd/pcd-collection";
import { Identity } from "@semaphore-protocol/identity";
import React from "react";

export type PendingAction =
  | { type: "new-passport"; email: string }
  | { type: "save-sync-key" };

export interface ZuState {
  // Zuzalu semaphore identity.
  identity: Identity;
  pcds: PCDCollection;
  encryptionKey?: string;

  // View state
  pendingAction?: PendingAction;
  modal: "info" | "settings" | "save-sync" | "";

  // Participant metadata.
  // TODO: reload from passport server on startup.
  self?: ZuParticipant;

  // If set, shows an error popover.
  error?: ZuError;
}

export interface ZuError {
  /** Big title, should be under 40 chars */
  title: string;
  /** Useful explanation, avoid "Something went wrong." */
  message: string | React.ReactNode;
  /** Optional stacktrace. */
  stack?: string;
  /** By default, user dismisses an error and returns to home screen. */
  dismissToCurrentPage?: boolean;
}
