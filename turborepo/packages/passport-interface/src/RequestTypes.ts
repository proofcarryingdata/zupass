import { EncryptedPacket } from "@pcd/passport-crypto";
import { PendingPCDStatus } from "./PendingPCDUtils";

export interface ProveRequest {
  pcdType: string;
  args: any;
}

export interface ProveResponse {
  /**
   * JSON.stringify(SerializedPCD)
   */
  serializedPCD: string;
}

export interface VerifyRequest {
  pcdType: string;

  /**
   * JSON.stringify(SerializedPCD)
   */
  serializedPCD: string;
}

export interface VerifyResponse {
  verified: boolean;
}

export interface StatusRequest {
  hash: string;
}

export interface StatusResponse {
  status: PendingPCDStatus;

  /**
   * If status === COMPLETE, JSON.stringify(SerializedPCD), else undefined
   */
  serializedPCD: string | undefined;

  /**
   * If status === ERROR, error string from server, else undefined;
   */
  error: string | undefined;
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
