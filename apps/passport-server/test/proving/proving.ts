import {
  isSettledPendingPCDStatus,
  PendingPCD,
  ProveRequest,
  StatusRequest,
  StatusResponse,
} from "@pcd/passport-interface";
import chai, { expect } from "chai";
import { Response } from "superagent";
import { PCDPass } from "../../src/types";

export async function sendProveRequest(
  application: PCDPass,
  proveRequest: ProveRequest,
  handler: (r: Response) => Promise<void>
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const { expressContext } = application;

    chai
      .request(expressContext.app)
      .post("/pcds/prove")
      .send(proveRequest)
      .then(async (r) => {
        try {
          await handler(r);
          resolve(r);
        } catch (e) {
          reject(e);
        }
      });
  });
}

export async function sendStatusRequest(
  application: PCDPass,
  statusRequest: StatusRequest,
  handler?: (r: Response) => Promise<void>
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const { expressContext } = application;

    chai
      .request(expressContext.app)
      .post("/pcds/status")
      .send(statusRequest)
      .then(async (r) => {
        try {
          await (handler && handler(r));
          resolve(r);
        } catch (e) {
          reject(e);
        }
      });
  });
}

export async function waitForSettledStatus(
  application: PCDPass,
  statusRequest: StatusRequest,
  handler?: (r: Response) => Promise<void>
) {
  let response = await sendStatusRequest(application, statusRequest);
  let responseBody = response.body as StatusResponse;

  while (!isSettledPendingPCDStatus(responseBody.status)) {
    response = await sendStatusRequest(application, statusRequest);
    responseBody = response.body as StatusResponse;
  }

  await (handler && handler(response));
  return response;
}

export async function submitAndWaitForPendingPCD(
  application: PCDPass,
  proveRequest: ProveRequest,
  settledResponseHandler: (status: Response) => Promise<void>
): Promise<void> {
  const proveResponse = await sendProveRequest(
    application,
    proveRequest,
    async (r) => {
      const response = r.body as PendingPCD;
      expect(response).to.haveOwnProperty("pcdType");
      expect(response).to.haveOwnProperty("hash");
      expect(response).to.haveOwnProperty("status");
      expect(r.statusCode).to.eq(200);
    }
  );

  const statusRequest: StatusRequest = {
    hash: proveResponse.body.hash,
  };

  const settledStatusResponse = await waitForSettledStatus(
    application,
    statusRequest
  );

  const settledResponseBody = settledStatusResponse.body as StatusResponse;
  expect(settledResponseBody).to.haveOwnProperty("status");
  await settledResponseHandler(settledStatusResponse);
}
