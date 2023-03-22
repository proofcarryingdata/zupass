import { ZuParticipant } from "@pcd/passport-interface";
import { PCDCollection } from "@pcd/pcd-collection";
import { Identity } from "@semaphore-protocol/identity";

export type PendingAction = { type: "new-passport"; email: string };

export interface ZuState {
  // Zuzalu semaphore identity.
  identity?: Identity;
  pcds: PCDCollection;
  pendingAction?: PendingAction;
  encryptionKey?: string;

  // Global background color
  bgColor: "gray" | "primary";

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
