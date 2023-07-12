import { Identity } from "@semaphore-protocol/identity";
import { appConfig } from "../appConfig";
import { IServerAPI } from "./api";

export async function requestConfirmationEmail(
  api: IServerAPI,
  email: string,
  identity: Identity,
  force: boolean
): Promise<Response> {
  if (appConfig.isZuzalu) {
    return api.requestZuzaluConfirmationEmail(email, identity, force);
  }

  return api.requestGenericConfirmationEmail(email, identity, force);
}

export async function submitNewUser(
  api: IServerAPI,
  email: string,
  token: string,
  identity: Identity
): Promise<Response> {
  if (appConfig.isZuzalu) {
    return api.submitNewZuzaluUser(email, token, identity);
  }

  return api.submitNewGenericUser(email, token, identity);
}

export async function requestUser(uuid: string): Promise<Response> {
  const url = `${appConfig.passportServer}/zuzalu/participant/${uuid}`;
  const response = await fetch(url);
  return response;
}

export async function requestZuzaluConfirmationEmail(
  email: string,
  identity: Identity,
  force: boolean
): Promise<Response> {
  const params = new URLSearchParams({
    email,
    commitment: identity.commitment.toString(),
    force: force ? "true" : "false",
  }).toString();
  const url = `${appConfig.passportServer}/zuzalu/send-login-email?${params}`;
  const res = await fetch(url, { method: "POST" });
  return res;
}

export async function submitNewZuzaluUser(
  email: string,
  token: string,
  identity: Identity
): Promise<Response> {
  // Verify the token, save the participant to local storage, redirect to
  // the home page.
  const query = new URLSearchParams({
    email,
    token,
    commitment: identity.commitment.toString(),
  }).toString();
  const loginUrl = `${appConfig.passportServer}/zuzalu/new-participant?${query}`;

  const res = await fetch(loginUrl);
  if (!res.ok) throw new Error(await res.text());
  return res;
}

export async function requestGenericConfirmationEmail(
  email: string,
  identity: Identity,
  force: boolean
): Promise<Response> {
  const params = new URLSearchParams({
    email,
    commitment: identity.commitment.toString(),
    force: force ? "true" : "false",
  }).toString();
  const url = `${appConfig.passportServer}/pcdpass/send-login-email?${params}`;
  const res = await fetch(url, { method: "POST" });
  return res;
}

export async function submitNewGenericUser(
  email: string,
  token: string,
  identity: Identity
): Promise<Response> {
  // Verify the token, save the participant to local storage, redirect to
  // the home page.
  const query = new URLSearchParams({
    email,
    token,
    commitment: identity.commitment.toString(),
  }).toString();
  const loginUrl = `${appConfig.passportServer}/pcdpass/new-participant?${query}`;

  const res = await fetch(loginUrl);
  if (!res.ok) throw new Error(await res.text());
  return res;
}
