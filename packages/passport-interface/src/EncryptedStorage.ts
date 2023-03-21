import { SerializedPCD } from "@pcd/pcd-types";
import { ZuParticipant } from "./zuzalu";

/**
 * For each user, we store an encrypted version of this interface which
 * allows us to sync their data between devices.
 */
export interface EncryptedStorage {
  serverToken: string;
  self: ZuParticipant;
  pcds: SerializedPCD[];
}
