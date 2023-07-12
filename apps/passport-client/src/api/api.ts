import { EncryptedPacket } from "@pcd/passport-crypto";
import {
  IssuedPCDsRequest,
  IssuedPCDsResponse,
  PendingPCD,
  ProveRequest,
} from "@pcd/passport-interface";
import { Identity } from "@semaphore-protocol/identity";
import React from "react";
import {
  requestEncryptedStorage,
  submitEncryptedStorage,
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

export const APIContext = React.createContext<IServerAPI | undefined>(
  undefined
);

export const API: IServerAPI = {
  requestEncryptedStorage,
  requestIssuedPCDs,
  requestPendingPCD,
  requestZuzaluConfirmationEmail,
  requestGenericConfirmationEmail,
  requestUser,
  submitEncryptedStorage,
  submitNewGenericUser,
  submitNewZuzaluUser,
};

export interface IServerAPI {
  requestEncryptedStorage(blobKey: string): Promise<EncryptedPacket | null>;
  submitEncryptedStorage(
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
