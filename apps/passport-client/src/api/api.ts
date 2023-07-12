import { EncryptedPacket } from "@pcd/passport-crypto";
import {
  IssuedPCDsRequest,
  IssuedPCDsResponse,
  PendingPCD,
  ProveRequest,
} from "@pcd/passport-interface";
import { Identity } from "@semaphore-protocol/identity";
import {
  downloadEncryptedStorage,
  uploadEncryptedStorage,
} from "./endToEndEncryptionApi";
import { requestIssuedPCDs } from "./issuedPCDs";
import { requestPendingPCD } from "./requestPendingPCD";
import {
  requestGenericConfirmationEmail,
  requestUser,
  requestZuzaluConfirmationEmail,
  submitNewGenericUser,
  submitNewZuzaluUser,
} from "./user";

export const WebApi: IServerApi = {
  downloadEncryptedStorage,
  uploadEncryptedStorage,
  requestIssuedPCDs,
  requestPendingPCD,
  requestUser,
  requestZuzaluConfirmationEmail,
  submitNewZuzaluUser,
  requestGenericConfirmationEmail,
  submitNewGenericUser,
};

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
