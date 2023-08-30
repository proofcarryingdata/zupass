import { appConfig } from "../appConfig";

export async function requestUser(uuid: string): Promise<Response> {
  if (appConfig.isZuzalu) {
    return requestZuzaluUser(uuid);
  }

  return requestPCDpassUser(uuid);
}

export async function requestZuzaluUser(uuid: string): Promise<Response> {
  const url = `${appConfig.passportServer}/zuzalu/participant/${uuid}`;
  const response = await fetch(url);
  return response;
}

export async function requestPCDpassUser(uuid: string): Promise<Response> {
  const url = `${appConfig.passportServer}/pcdpass/participant/${uuid}`;
  const response = await fetch(url);
  return response;
}

export async function requestConfirmationEmail(
  email: string,
  identityCommitment: string,
  force: boolean
): Promise<Response> {
  if (appConfig.isZuzalu) {
    return requestZuzaluConfirmationEmail(email, identityCommitment, force);
  }

  return requestGenericConfirmationEmail(email, identityCommitment, force);
}

export async function submitNewUser(
  email: string,
  token: string,
  identityCommitment: string
): Promise<Response> {
  if (appConfig.isZuzalu) {
    return submitNewZuzaluUser(email, token, identityCommitment);
  }

  return submitNewGenericUser(email, token, identityCommitment);
}

export async function requestZuzaluConfirmationEmail(
  email: string,
  identityCommitment: string,
  force: boolean
): Promise<Response> {
  const params = new URLSearchParams({
    email,
    commitment: identityCommitment,
    force: force ? "true" : "false"
  }).toString();
  const url = `${appConfig.passportServer}/zuzalu/send-login-email?${params}`;
  const res = await fetch(url, { method: "POST" });
  return res;
}

export async function submitNewZuzaluUser(
  email: string,
  token: string,
  identityCommitment: string
): Promise<Response> {
  // Verify the token, save the participant to local storage, redirect to
  // the home page.
  const query = new URLSearchParams({
    email,
    token,
    commitment: identityCommitment
  }).toString();
  const loginUrl = `${appConfig.passportServer}/zuzalu/new-participant?${query}`;

  const res = await fetch(loginUrl);
  if (!res.ok) throw new Error(await res.text());
  return res;
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
  const url = `${appConfig.passportServer}/pcdpass/send-login-email?${params}`;
  const res = await fetch(url, { method: "POST" });
  return res;
}

export async function submitNewGenericUser(
  email: string,
  token: string,
  identityCommitment: string
): Promise<Response> {
  // Verify the token, save the participant to local storage, redirect to
  // the home page.
  const query = new URLSearchParams({
    email,
    token,
    commitment: identityCommitment
  }).toString();
  const loginUrl = `${appConfig.passportServer}/pcdpass/new-participant?${query}`;

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
  const loginUrl = `${appConfig.passportServer}/pcdpass/device-login?${query}`;

  const res = await fetch(loginUrl, { method: "POST" });
  if (!res.ok) throw new Error(await res.text());
  return res;
}
