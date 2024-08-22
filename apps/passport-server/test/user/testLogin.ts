import { arrayBufferToHexString } from "@pcd/passport-crypto";
import {
  requestConfirmationEmail,
  requestCreateNewUser,
  requestUser,
  User
} from "@pcd/passport-interface";
import { Identity } from "@semaphore-protocol/identity";
import { expect } from "chai";
import { randomBytes } from "crypto";
import { Zupass } from "../../src/types";

export async function testLogin(
  application: Zupass,
  email: string,
  {
    force,
    skipSetupPassword,
    expectUserAlreadyLoggedIn,
    expectEmailIncorrect
  }: {
    force: boolean;
    skipSetupPassword: boolean;
    expectUserAlreadyLoggedIn: boolean;
    expectEmailIncorrect: boolean;
  }
): Promise<{ user: User; identity: Identity } | undefined> {
  const { userService, emailTokenService } = application.services;
  const identity = new Identity();
  // const v4Identity = v3tov4Identity(identity);
  const v3Commitment = identity.commitment.toString();

  const confirmationEmailResult = await requestConfirmationEmail(
    application.expressContext.localEndpoint,
    email,
    v3Commitment,
    force
  );

  if (expectEmailIncorrect) {
    expect(confirmationEmailResult.error).to.contain("is not a valid email");
    expect(confirmationEmailResult.value).to.eq(undefined);
    expect(confirmationEmailResult.success).to.eq(false);
    return undefined;
  } else if (expectUserAlreadyLoggedIn && !force) {
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
    expect(confirmationEmailResult.value).to.not.eq(undefined);

    if (!confirmationEmailResult.value?.devToken) {
      throw new Error(
        "expected to get the verification token in bypassEmail mode"
      );
    }
    token = confirmationEmailResult.value.devToken;
  } else {
    const serverToken = await emailTokenService.getTokenForEmail(email);
    if (serverToken === null) {
      throw new Error(
        "expected to be able to get the verification token from the internal server state"
      );
    }
    token = serverToken;
  }

  const salt = arrayBufferToHexString(randomBytes(32));
  let encryptionKey: string | undefined = undefined;
  if (skipSetupPassword) {
    encryptionKey = arrayBufferToHexString(randomBytes(32));
  }

  const newUserResult = await requestCreateNewUser(
    application.expressContext.localEndpoint,
    email,
    token,
    v3Commitment,
    skipSetupPassword ? undefined : salt,
    encryptionKey,
    undefined
  );

  if (!newUserResult.value) {
    throw new Error("expected to get a user");
  }

  expect(newUserResult.value).to.haveOwnProperty("uuid");
  expect(newUserResult.value).to.haveOwnProperty("commitment");
  expect(newUserResult.value).to.haveOwnProperty("emails");
  expect(newUserResult.success).to.eq(true);
  expect(newUserResult.value.commitment).to.eq(v3Commitment);
  expect(newUserResult.value.emails).to.deep.eq([email]);

  const getUserResponse = await requestUser(
    application.expressContext.localEndpoint,
    newUserResult.value.uuid
  );

  if (!getUserResponse.value) {
    throw new Error("expected to get a user");
  }

  expect(getUserResponse.value).to.deep.eq(newUserResult.value);

  return { user: getUserResponse.value, identity };
}
