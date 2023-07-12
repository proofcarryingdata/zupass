import { EncryptedPacket } from "@pcd/passport-crypto";
import {
  IssuedPCDsRequest,
  IssuedPCDsResponse,
  PendingPCD,
  ProveRequest,
} from "@pcd/passport-interface";
import { PCDPackage } from "@pcd/pcd-types";
import { Identity } from "@semaphore-protocol/identity";
import { IServerAPI } from "../../src/api/api";

export class MockServerAPI implements IServerAPI {
  requestEncryptedStorage(blobKey: string): Promise<EncryptedPacket> {
    throw new Error("Method not implemented.");
  }

  submitEncryptedStorage(
    blobKey: string,
    encryptedStorage: EncryptedPacket
  ): Promise<void> {
    throw new Error("Method not implemented.");
  }

  requestIssuedPCDs(request: IssuedPCDsRequest): Promise<IssuedPCDsResponse> {
    throw new Error("Method not implemented.");
  }

  requestPendingPCD(
    serverReq: ProveRequest<PCDPackage<any, any, any, any>>
  ): Promise<PendingPCD> {
    throw new Error("Method not implemented.");
  }

  requestUser(uuid: string): Promise<Response> {
    throw new Error("Method not implemented.");
  }

  requestZuzaluConfirmationEmail(
    email: string,
    identity: Identity,
    force: boolean
  ): Promise<Response> {
    throw new Error("Method not implemented.");
  }

  submitNewZuzaluUser(
    email: string,
    token: string,
    identity: Identity
  ): Promise<Response> {
    throw new Error("Method not implemented.");
  }

  requestGenericConfirmationEmail(
    email: string,
    identity: Identity,
    force: boolean
  ): Promise<Response> {
    throw new Error("Method not implemented.");
  }

  submitNewGenericUser(
    email: string,
    token: string,
    identity: Identity
  ): Promise<Response> {
    throw new Error("Method not implemented.");
  }
}
