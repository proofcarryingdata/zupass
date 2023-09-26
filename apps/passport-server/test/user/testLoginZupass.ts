import {
  requestConfirmationEmail,
  requestCreateNewUser,
  requestUser,
  toZupassUser,
  User
} from "@pcd/passport-interface";
import { Identity } from "@semaphore-protocol/identity";
import { expect } from "chai";
import { PCDpass } from "../../src/types";

export async function testLoginZupass(
  application: PCDpass,
  email: string,
  {
    force,
    expectAlreadyRegistered,
    expectDoesntHaveTicket,
    expectEmailInvalid
  }: {
    expectAlreadyRegistered: boolean;
    force: boolean;
    expectDoesntHaveTicket: boolean;
    expectEmailInvalid: boolean;
  }
): Promise<{ user: User; identity: Identity } | undefined> {
  const { userService, emailTokenService } = application.services;
  const identity = new Identity();
  const commitment = identity.commitment.toString();

  const confirmationEmailResult = await requestConfirmationEmail(
    application.expressContext.localEndpoint,
    true,
    email,
    commitment,
    force
  );

  if (expectEmailInvalid) {
    expect(confirmationEmailResult.error).to.contain("is not a valid email");
    expect(confirmationEmailResult.value).to.eq(undefined);
    expect(confirmationEmailResult.success).to.eq(false);
    return undefined;
  } else if (expectDoesntHaveTicket) {
    expect(confirmationEmailResult.error).to.contain("doesn't have a ticket");
    expect(confirmationEmailResult.value).to.eq(undefined);
    expect(confirmationEmailResult.success).to.eq(false);
    return undefined;
  } else if (expectAlreadyRegistered && !force) {
    expect(confirmationEmailResult.error).to.contain("already registered");
    expect(confirmationEmailResult.value).to.eq(undefined);
    expect(confirmationEmailResult.success).to.eq(false);
    return undefined;
  } else {
    expect(confirmationEmailResult.error).to.eq(undefined);
    expect(confirmationEmailResult.success).to.eq(true);
  }

  let token: string;

  if (userService.bypassEmail) {
    if (confirmationEmailResult.value?.devToken == null) {
      throw new Error("expected a dev token in bypass email mode");
    }
    expect(confirmationEmailResult.error).to.eq(undefined);
    token = confirmationEmailResult.value.devToken;
  } else {
    expect(confirmationEmailResult.value).to.eq(undefined);
    const tokenFromServer = await emailTokenService.getTokenForEmail(email);
    if (tokenFromServer == null) {
      throw new Error(
        "expected to be able to get the token from internal server state"
      );
    }
    token = tokenFromServer;
  }

  const newUserResult = await requestCreateNewUser(
    application.expressContext.localEndpoint,
    true,
    email,
    token,
    commitment,
    ""
  );

  if (!newUserResult.value) {
    throw new Error("expected to get a user");
  }

  expect(newUserResult.value).to.haveOwnProperty("uuid");
  expect(newUserResult.value).to.haveOwnProperty("commitment");
  expect(newUserResult.value).to.haveOwnProperty("email");
  expect(newUserResult.success).to.eq(true);
  expect(newUserResult.value.commitment).to.eq(commitment);
  expect(newUserResult.value.email).to.eq(email);

  const getUserResponse = await requestUser(
    application.expressContext.localEndpoint,
    true,
    newUserResult.value.uuid
  );

  if (!getUserResponse.value) {
    throw new Error("expected to get a user");
  }

  expect(getUserResponse.value).to.deep.eq(newUserResult.value);
  expect(getUserResponse.success).to.eq(true);

  return { identity, user: toZupassUser(newUserResult.value) };
}
