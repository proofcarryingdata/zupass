import {
  isSettledPendingPCDStatus,
  ProveRequest,
  StatusRequest,
  StatusResponse,
} from "@pcd/passport-interface";
import chai from "chai";
import chaiHttp from "chai-http";
import { Response } from "superagent";
import { PCDPass } from "../../src/types";

chai.use(chaiHttp);

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
