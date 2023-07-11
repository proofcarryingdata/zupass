import { IssuedPCDsRequest } from "@pcd/passport-interface";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { Identity } from "@semaphore-protocol/identity";
import chai from "chai";
import { Response } from "superagent";
import { PCDPass } from "../../src/types";

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
  identity: Identity
): Promise<Response> {
  const request: IssuedPCDsRequest = {
    userProof: await SemaphoreSignaturePCDPackage.serialize(
      await SemaphoreSignaturePCDPackage.prove({
        identity: {
          argumentType: ArgumentTypeName.PCD,
          value: await SemaphoreIdentityPCDPackage.serialize(
            await SemaphoreIdentityPCDPackage.prove({
              identity,
            })
          ),
        },
        signedMessage: {
          argumentType: ArgumentTypeName.String,
          value: "test string", // TODO: make this more secure
        },
      })
    ),
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
