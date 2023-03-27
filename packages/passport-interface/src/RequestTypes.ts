import { EncryptedPacket } from "@pcd/passport-crypto";

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
   * On the server-side, encrypted storage is keyed by the hash of
   * the encryption key.
   */
  blobKey: string;

  /**
   * An encrypted and stringified version of {@link EncryptedStorage}
   */
  encryptedBlob: string;
}

export interface SaveE2EEResponse {}

export interface LoadE2EERequest {
  /**
   * On the server-side, encrypted storage is keyed by the hash of
   * the encryption key.
   */
  blobKey: string;
}

export interface LoadE2EEResponse {
  /**
   * The encrypted storage of all the user's PCDs.
   */
  encryptedStorage: EncryptedPacket;
}
