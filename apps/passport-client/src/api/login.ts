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
