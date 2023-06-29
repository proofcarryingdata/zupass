import { SerializedPCD } from "@pcd/pcd-types";
import { User } from "./zuzalu";

/**
 * For each user, we store an encrypted version of this interface which
 * allows us to sync their data between devices.
 */
export interface EncryptedStorage {
  self: User;
  pcds: SerializedPCD[];
}
