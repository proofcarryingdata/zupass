import { Identity } from "@semaphore-protocol/identity";
import { config } from "../config";

export async function requestConfirmationEmail(
  email: string,
  identity: Identity,
  force: boolean
): Promise<Response> {
  const params = new URLSearchParams({
    email,
    commitment: identity.commitment.toString(),
    force: force ? "true" : "false",
  }).toString();
  const url = `${config.passportServer}/zuzalu/send-login-email?${params}`;
  const res = await fetch(url, { method: "POST" });
  return res;
}

export async function submitNewUser(
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
  const loginUrl = `${config.passportServer}/zuzalu/new-participant?${query}`;

  const res = await fetch(loginUrl);
  if (!res.ok) throw new Error(await res.text());
  return res;
}
