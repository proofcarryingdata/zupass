import { Identity } from "@semaphore-protocol/identity";
import { ZuParticipant } from "./participant";

export type PendingAction = { type: "new-passport"; email: string };

export interface ZuState {
  identity?: Identity;
  pendingAction?: PendingAction;
  self?: ZuParticipant;
  error?: ZuError;
}

export interface ZuError {
  title: string;
  message: string;
  stack?: string;
}
