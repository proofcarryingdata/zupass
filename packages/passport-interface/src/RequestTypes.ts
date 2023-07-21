import { EncryptedPacket } from "@pcd/passport-crypto";
import { ArgsOf, PCDPackage, SerializedPCD } from "@pcd/pcd-types";
import { RSATicketPCD } from "@pcd/rsa-ticket-pcd";
import { SemaphoreSignaturePCD } from "@pcd/semaphore-signature-pcd";
import { PendingPCDStatus } from "./PendingPCDUtils";

export interface ProveRequest<T extends PCDPackage = PCDPackage> {
  pcdType: string;
  args: ArgsOf<T>;
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

/**
 * The string the client must sign with the user's semaphore identity
 * in order to be able to request the PCDs that the server wants to
 * issue the user.
 */
export const ISSUANCE_STRING = "Issue me PCDs please.";

/**
 * The POST request body of the client's request to the server which
 * asks for the PCDs that have been issued to the given user.
 */
export interface IssuedPCDsRequest {
  /**
   * A semaphore signature by the user who is requesting the data. The
   * signature is only accepted if it is of the string {@link ISSUANCE_STRING}.
   */
  userProof: SerializedPCD<SemaphoreSignaturePCD>;
}

/**
 * The response body that the server responds with to an {@link IssuedPCDsRequest}.
 */
export interface IssuedPCDsResponse {
  pcds: SerializedPCD[];
}

export interface CheckTicketRequest {
  ticket: SerializedPCD<RSATicketPCD>;
}

export type CheckTicketResponse =
  | {
      success: true;
    }
  | { success: false; error: TicketError };

export type TicketError =
  | {
      name: "AlreadyCheckedIn";
      checkinTimestamp: number;
    }
  | { name: "InvalidSignature" }
  | { name: "InvalidTicket" }
  | { name: "TicketRevoked"; revokedTimestamp: number }
  | { name: "NetworkError" }
  | { name: "ServerError" };

export interface CheckInRequest {
  ticket: SerializedPCD<RSATicketPCD>;
}

export type CheckInResponse = CheckTicketResponse;
