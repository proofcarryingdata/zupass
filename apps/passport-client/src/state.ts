import { Identity } from "@semaphore-protocol/identity";
import { ZuParticipant } from "./participant";

export interface ZuState {
  identity?: Identity;
  self?: ZuParticipant;
}
