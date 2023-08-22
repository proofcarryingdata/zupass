import { EdDSATicketPCD, EdDSATicketPCDPackage } from "@pcd/eddsa-ticket-pcd";
import {
  CheckInRequest,
  ISSUANCE_STRING,
  IssuedPCDsRequest
} from "@pcd/passport-interface";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { Identity } from "@semaphore-protocol/identity";
import chai from "chai";
import { Response } from "superagent";
import { PCDPass } from "../../src/types";

export async function requestIssuanceServiceEnabled(
  application: PCDPass
): Promise<boolean> {
  const response = await chai
    .request(application.expressContext.app)
    .get("/issue/enabled")
    .send();

  return response.text === "true";
}

export async function requestServerRSAPublicKey(
  application: PCDPass
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const { expressContext } = application;
    chai
      .request(expressContext.app)
      .get("/issue/rsa-public-key")
      .send()
      .then(async (r) => {
        try {
          resolve(r);
        } catch (e) {
          reject(e);
        }
      });
  });
}

export async function requestServerEdDSAPublicKey(
  application: PCDPass
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const { expressContext } = application;
    chai
      .request(expressContext.app)
      .get("/issue/eddsa-public-key")
      .send()
      .then(async (r) => {
        try {
          resolve(r);
        } catch (e) {
          reject(e);
        }
      });
  });
}

export async function requestIssuedPCDs(
  application: PCDPass,
  identity: Identity,
  signedMessage: string
): Promise<Response> {
  const request: IssuedPCDsRequest = {
    userProof: await SemaphoreSignaturePCDPackage.serialize(
      await SemaphoreSignaturePCDPackage.prove({
        identity: {
          argumentType: ArgumentTypeName.PCD,
          value: await SemaphoreIdentityPCDPackage.serialize(
            await SemaphoreIdentityPCDPackage.prove({
              identity
            })
          )
        },
        signedMessage: {
          argumentType: ArgumentTypeName.String,
          value: signedMessage
        }
      })
    )
  };

  return new Promise((resolve, reject) => {
    const { expressContext } = application;

    chai
      .request(expressContext.app)
      .post("/issue")
      .send(request)
      .then(async (r) => {
        try {
          resolve(r);
        } catch (e) {
          reject(e);
        }
      });
  });
}

export async function requestCheckIn(
  application: PCDPass,
  ticket: EdDSATicketPCD,
  checkerIdentity: Identity
): Promise<Response> {
  const request: CheckInRequest = {
    ticket: await EdDSATicketPCDPackage.serialize(ticket),
    checkerProof: await SemaphoreSignaturePCDPackage.serialize(
      await SemaphoreSignaturePCDPackage.prove({
        identity: {
          argumentType: ArgumentTypeName.PCD,
          value: await SemaphoreIdentityPCDPackage.serialize(
            await SemaphoreIdentityPCDPackage.prove({
              identity: checkerIdentity
            })
          )
        },
        signedMessage: {
          argumentType: ArgumentTypeName.String,
          value: ISSUANCE_STRING
        }
      })
    )
  };

  return new Promise((resolve, reject) => {
    const { expressContext } = application;

    chai
      .request(expressContext.app)
      .post("/issue/check-in")
      .send(request)
      .then(async (r) => {
        try {
          resolve(r);
        } catch (e) {
          reject(e);
        }
      });
  });
}
