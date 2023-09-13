import { SERVER_URL } from "../config";

export async function requestUser(uuid: string): Promise<Response> {
  return requestPCDpassUser(uuid);
}

export async function requestPCDpassUser(uuid: string): Promise<Response> {
  const url = `${SERVER_URL}/pcdpass/participant/${uuid}`;
  const response = await fetch(url);
  return response;
}

export async function requestConfirmationEmail(
  email: string,
  identityCommitment: string,
  force: boolean
): Promise<Response> {
  return requestGenericConfirmationEmail(email, identityCommitment, force);
}

export async function submitNewUser(
  email: string,
  token: string,
  identityCommitment: string,
  salt: string
): Promise<Response> {
  return submitNewGenericUser(email, token, identityCommitment, salt);
}

export async function requestGenericConfirmationEmail(
  email: string,
  identityCommitment: string,
  force: boolean
): Promise<Response> {
  const params = new URLSearchParams({
    email,
    commitment: identityCommitment,
    force: force ? "true" : "false"
  }).toString();
  const url = `${SERVER_URL}/pcdpass/send-login-email?${params}`;
  const res = await fetch(url, { method: "POST" });
  return res;
}

export async function submitNewGenericUser(
  email: string,
  token: string,
  identityCommitment: string,
  salt: string
): Promise<Response> {
  // Verify the token, save the participant to local storage, redirect to
  // the home page.
  const query = new URLSearchParams({
    email,
    token,
    commitment: identityCommitment,
    salt: salt
  }).toString();
  const loginUrl = `${SERVER_URL}/pcdpass/new-participant?${query}`;

  const res = await fetch(loginUrl);
  if (!res.ok) throw new Error(await res.text());
  return res;
}

export async function submitDeviceLogin(
  email: string,
  secret: string,
  identityCommitment: string
): Promise<Response> {
  const query = new URLSearchParams({
    email,
    secret,
    commitment: identityCommitment
  }).toString();
  const loginUrl = `${SERVER_URL}/pcdpass/device-login?${query}`;

  const res = await fetch(loginUrl, { method: "POST" });
  if (!res.ok) throw new Error(await res.text());
  return res;
}

/**
 * Server checks that email address is on the list, then sends the code. In the
 * case that verification emails are disabled on the server, also returns the
 * confirmation code, so the client can automatically 'verify' the user.
 */
export async function requestLoginCode(
  email: string,
  identityCommitment: string,
  force = false
): Promise<string | undefined> {
  const loginResponse = await requestConfirmationEmail(
    email,
    identityCommitment,
    force
  );
  const responseText = await loginResponse.text();

  try {
    // in the case that email verification is disabled, we get back
    // the token in the response to this request
    const parsedResponse = JSON.parse(responseText);
    if (parsedResponse.token) {
      return parsedResponse.token;
    }
  } catch (e) {
    console.log(e);
  }

  if (loginResponse.ok) return undefined;

  throw new Error(responseText);
}
