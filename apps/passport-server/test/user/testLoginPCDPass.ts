import { arrayBufferToHexString } from "@pcd/passport-crypto/src/utils";
import { User } from "@pcd/passport-interface";
import { Identity } from "@semaphore-protocol/identity";
import { expect } from "chai";
import { randomBytes } from "crypto";
import httpMocks from "node-mocks-http";
import { PCDpass } from "../../src/types";

export async function testLoginPCDpass(
  application: PCDpass,
  email: string,
  {
    force,
    expectUserAlreadyLoggedIn,
    expectEmailIncorrect
  }: {
    force: boolean;
    expectUserAlreadyLoggedIn: boolean;
    expectEmailIncorrect: boolean;
  }
): Promise<{ user: User; identity: Identity } | undefined> {
  const { userService, emailTokenService } = application.services;
  const identity = new Identity();
  const commitment = identity.commitment.toString();
  const sendEmailResponse = httpMocks.createResponse();
  await userService.handleSendPCDpassEmail(
    email,
    commitment,
    force,
    sendEmailResponse
  );

  if (expectEmailIncorrect) {
    expect(sendEmailResponse.statusCode).to.eq(500);
    expect(sendEmailResponse._getData()).to.contain("is not a valid email");
    return undefined;
  } else if (expectUserAlreadyLoggedIn && !force) {
    expect(sendEmailResponse.statusCode).to.eq(500);
    expect(sendEmailResponse._getData()).to.contain("already registered");
    return undefined;
  } else {
    expect(sendEmailResponse.statusCode).to.eq(200);
  }

  let token: string;

  if (userService.bypassEmail) {
    const sendEmailResponseJson = sendEmailResponse._getJSONData();
    expect(sendEmailResponseJson).to.haveOwnProperty("token");
    token = sendEmailResponseJson.token;
  } else {
    token = (await emailTokenService.getTokenForEmail(email)) as string;
    expect(token).to.not.eq(null);
  }

  const newUserResponse = httpMocks.createResponse();
  const salt = arrayBufferToHexString(randomBytes(32));
  await userService.handleNewPCDpassUser(
    token,
    email,
    commitment,
    salt,
    newUserResponse
  );

  const newUserResponseJson = newUserResponse._getJSONData();
  expect(newUserResponseJson).to.haveOwnProperty("uuid");
  expect(newUserResponseJson).to.haveOwnProperty("commitment");
  expect(newUserResponseJson).to.haveOwnProperty("email");
  expect(newUserResponseJson.commitment).to.eq(commitment);
  expect(newUserResponseJson.email).to.eq(email);

  const getUserResponse = httpMocks.createResponse();
  await userService.handleGetPCDpassUser(
    newUserResponseJson.uuid,
    getUserResponse
  );
  const getUserResponseJson: User = getUserResponse._getJSONData();

  expect(getUserResponseJson).to.deep.eq(newUserResponseJson);

  return { user: getUserResponseJson, identity };
}
