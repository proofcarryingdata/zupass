import { EncryptedPacket } from "@pcd/passport-crypto";
import {
  IssuedPCDsRequest,
  IssuedPCDsResponse,
  PendingPCD,
  ProveRequest,
} from "@pcd/passport-interface";
import { Identity } from "@semaphore-protocol/identity";

export interface IServerApi {
  downloadEncryptedStorage(blobKey: string): Promise<EncryptedPacket | null>;
  uploadEncryptedStorage(
    blobKey: string,
    encryptedStorage: EncryptedPacket
  ): Promise<void>;
  requestIssuedPCDs(
    request: IssuedPCDsRequest
  ): Promise<IssuedPCDsResponse | undefined>;
  requestPendingPCD(serverReq: ProveRequest): Promise<PendingPCD>;
  requestUser(uuid: string): Promise<Response>;
  requestZuzaluConfirmationEmail(
    email: string,
    identity: Identity,
    force: boolean
  ): Promise<Response>;
  submitNewZuzaluUser(
    email: string,
    token: string,
    identity: Identity
  ): Promise<Response>;
  requestGenericConfirmationEmail(
    email: string,
    identity: Identity,
    force: boolean
  ): Promise<Response>;
  submitNewGenericUser(
    email: string,
    token: string,
    identity: Identity
  ): Promise<Response>;
}
