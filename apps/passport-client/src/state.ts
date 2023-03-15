import { Identity } from "@semaphore-protocol/identity";
import { ZuParticipant } from "./participant";

export type PendingAction = { type: "new-passport"; email: string };

export interface ZuState {
  // Zuzalu semaphore identity.
  identity?: Identity;

  // Participant metadata.
  // TODO: reload from passport server on startup.
  self?: ZuParticipant;

  // Pending action for pages like the New Passport page.
  pendingAction?: PendingAction;

  // If set, shows an error popover.
  error?: ZuError;
}

export interface ZuError {
  title: string;
  message: string;
  stack?: string;
}
