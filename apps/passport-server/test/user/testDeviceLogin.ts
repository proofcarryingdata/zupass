import {
  requestDeviceLogin,
  requestUser,
  toPCDpassUser,
  User
} from "@pcd/passport-interface";
import { Identity } from "@semaphore-protocol/identity";
import { expect } from "chai";
import { PCDpass } from "../../src/types";

export async function testDeviceLogin(
  application: PCDpass,
  email: string,
  secret: string
): Promise<{ user: User; identity: Identity } | undefined> {
  const identity = new Identity();
  const commitment = identity.commitment.toString();

  const deviceLoginResponse = await requestDeviceLogin(
    application.expressContext.localEndpoint,
    email,
    secret,
    commitment
  );

  if (!deviceLoginResponse.value) {
    throw new Error("expected to get a user");
  }

  expect(deviceLoginResponse.value).to.haveOwnProperty("uuid");
  expect(deviceLoginResponse.value).to.haveOwnProperty("commitment");
  expect(deviceLoginResponse.value).to.haveOwnProperty("email");
  expect(deviceLoginResponse.success).to.eq(true);
  expect(deviceLoginResponse.value?.commitment).to.eq(commitment);
  expect(deviceLoginResponse.value?.email).to.eq(email);

  const getUserResult = await requestUser(
    application.expressContext.localEndpoint,
    false,
    deviceLoginResponse.value?.uuid
  );

  if (!getUserResult.value) {
    throw new Error("expected to get a user");
  }

  expect(getUserResult.value).to.deep.eq(deviceLoginResponse.value);
  expect(getUserResult.success).to.deep.eq(true);

  return { user: toPCDpassUser(getUserResult.value), identity };
}

export async function testFailedDeviceLogin(
  application: PCDpass,
  email: string,
  secret: string
): Promise<void> {
  const identity = new Identity();
  const commitment = identity.commitment.toString();

  const deviceLoginResponse = await requestDeviceLogin(
    application.expressContext.localEndpoint,
    email,
    secret,
    commitment
  );

  expect(deviceLoginResponse.error).to.eq(true);
}
