import { ZuParticipant } from "@pcd/passport-interface";
import { Identity } from "@semaphore-protocol/identity";
import { expect } from "chai";
import httpMocks from "node-mocks-http";
import { PCDPass } from "../../src/types";
import { randomEmail } from "../util/util";

export async function loginPCDPass(
  application: PCDPass
): Promise<ZuParticipant> {
  const { userService, emailTokenService } = application.globalServices;
  const testEmail = randomEmail();
  const identity = new Identity();
  const commitment = identity.commitment.toString();

  const sendEmailResponse = httpMocks.createResponse();
  await userService.handleSendPcdPassEmail(
    testEmail,
    commitment,
    true,
    sendEmailResponse
  );

  expect(sendEmailResponse.statusCode).to.eq(200);

  let token: string;

  if (userService.bypassEmail) {
    const sendEmailResponseJson = sendEmailResponse._getJSONData();
    expect(sendEmailResponseJson).to.haveOwnProperty("token");
    token = sendEmailResponseJson.token;
  } else {
    token = (await emailTokenService.getTokenForEmail(testEmail)) as string;
    expect(token).to.not.eq(null);
  }

  const newUserResponse = httpMocks.createResponse();
  await userService.handleNewPcdPassUser(
    token,
    testEmail,
    commitment,
    newUserResponse
  );

  const newUserResponseJson = newUserResponse._getJSONData();
  expect(newUserResponseJson).to.haveOwnProperty("uuid");
  expect(newUserResponseJson).to.haveOwnProperty("commitment");
  expect(newUserResponseJson).to.haveOwnProperty("participant_email");
  expect(newUserResponseJson.commitment).to.eq(commitment);
  expect(newUserResponseJson.participant_email).to.eq(testEmail);

  const getUserResponse = httpMocks.createResponse();
  await userService.handleGetPcdPassUser(
    newUserResponseJson.uuid,
    getUserResponse
  );
  const getUserResponseJson = getUserResponse._getJSONData();

  expect(getUserResponseJson).to.deep.eq(newUserResponseJson);

  return getUserResponseJson;
}
