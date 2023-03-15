import { PCD } from "@pcd/pcd-types";
import { Identity } from "@semaphore-protocol/identity";
import { ZuParticipant } from "./participant";

export type PendingAction = { type: "new-passport"; email: string };

export interface ZuState {
  // Zuzalu semaphore identity.
  identity?: Identity;
  pcds: PCD[];
  pendingAction?: PendingAction;

  // Participant metadata.
  // TODO: reload from passport server on startup.
  self?: ZuParticipant;

  // If set, shows an error popover.
  error?: ZuError;
}

export interface ZuError {
  title: string;
  message: string;
  stack?: string;
}
