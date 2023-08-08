import {
  CheckInRequest,
  FeedRequest,
  ISSUANCE_STRING
} from "@pcd/passport-interface";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { RSATicketPCD, RSATicketPCDPackage } from "@pcd/rsa-ticket-pcd";
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

export async function requestServerPublicKey(
  application: PCDPass
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const { expressContext } = application;
    chai
      .request(expressContext.app)
      .get("/issue/public-key")
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
  const request: FeedRequest = {
    feedId: "1",
    pcd: await SemaphoreSignaturePCDPackage.serialize(
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
      .post("/feeds")
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
  ticket: RSATicketPCD,
  checkerIdentity: Identity
): Promise<Response> {
  const request: CheckInRequest = {
    ticket: await RSATicketPCDPackage.serialize(ticket),
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
