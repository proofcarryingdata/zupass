import { Identity } from "@semaphore-protocol/identity";
import { ZuParticipant } from "./participant";

export type ZuScreen = "login" | "gen-passport" | "home" | "scan-and-verify";

export interface ZuState {
  screen: ZuScreen;
  identity?: Identity;
  self?: ZuParticipant;
}
