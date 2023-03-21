import { EncryptedPacket } from "@pcd/passport-crypto";
import { EncryptedStorage } from "@pcd/passport-interface";

export interface ProveRequest {
  pcdType: string;
  args: any;
}

export interface ProveResponse {
  serializedPCD: string;
}

export interface VerifyRequest {
  pcdType: string;
  serializedPCD: string;
}

export interface VerifyResponse {
  verified: boolean;
}

export interface SupportedPCDsResponse {
  names: string[];
}

export interface SaveE2EERequest {
  /**
   * The email of the user for whom we are saving their
   * end to end encrypted storage.
   */
  email: string;

  /**
   * An encrypted and stringified version of {@link EncryptedStorage}
   */
  encryptedBlob: string;
}

export interface SaveE2EEResponse {}

export interface LoadE2EERequest {
  /**
   * The email of the user for whom we are loading their
   * end to end encrypted storage.
   */
  email: string;
}

export interface LoadE2EEResponse {
  /**
   * The encrypted storage of all the user's PCDs.
   */
  encryptedStorage: EncryptedPacket;
}
