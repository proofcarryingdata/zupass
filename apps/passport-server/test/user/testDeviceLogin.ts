import { User } from "@pcd/passport-interface";
import { Identity } from "@semaphore-protocol/identity";
import { expect } from "chai";
import httpMocks from "node-mocks-http";
import { PCDpass } from "../../src/types";

export async function testDeviceLogin(
  application: PCDpass,
  email: string,
  secret: string
): Promise<{ user: User; identity: Identity } | undefined> {
  const { userService } = application.services;
  const identity = new Identity();
  const commitment = identity.commitment.toString();

  const newDeviceLoginResponse = httpMocks.createResponse();
  await userService.handleNewDeviceLogin(
    secret,
    email,
    commitment,
    newDeviceLoginResponse
  );

  const newDeviceLoginResponseJson = newDeviceLoginResponse._getJSONData();

  expect(newDeviceLoginResponseJson).to.haveOwnProperty("uuid");
  expect(newDeviceLoginResponseJson).to.haveOwnProperty("commitment");
  expect(newDeviceLoginResponseJson).to.haveOwnProperty("email");
  expect(newDeviceLoginResponseJson.commitment).to.eq(commitment);
  expect(newDeviceLoginResponseJson.email).to.eq(email);

  const getUserResponse = httpMocks.createResponse();
  await userService.handleGetPCDpassUser(
    newDeviceLoginResponseJson.uuid,
    getUserResponse
  );

  const getUserResponseJson: User = getUserResponse._getJSONData();

  expect(getUserResponseJson).to.deep.eq(newDeviceLoginResponseJson);

  return { user: getUserResponseJson, identity };
}

export async function testFailedDeviceLogin(
  application: PCDpass,
  email: string,
  secret: string
): Promise<void> {
  const { userService } = application.services;
  const identity = new Identity();
  const commitment = identity.commitment.toString();

  const newDeviceLoginResponse = httpMocks.createResponse();
  await userService.handleNewDeviceLogin(
    secret,
    email,
    commitment,
    newDeviceLoginResponse
  );

  expect(newDeviceLoginResponse.statusCode).to.eq(500);
}
