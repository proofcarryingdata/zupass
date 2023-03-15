import * as React from "react";
import { useContext } from "react";
import { config } from "../../src/config";
import { DispatchContext } from "../../src/dispatch";
import { Spacer, TextCenter, TextSecondary } from "../core";

/**
 * Show the user that we're generating their passport. Direct them to the email
 * verification link.
 */
export function NewPassportScreen() {
  const [state] = useContext(DispatchContext);
  const { identity, pendingAction } = state;
  if (pendingAction == null || pendingAction.type !== "new-passport") {
    // throw new Error("Missing pending action");
  }
  const { email } = pendingAction;

  let saveSelfPage = encodeURIComponent(window.location.origin + "#/save-self");

  // Create a magic link to the passport server.
  // TODO: move this to server side, add a token/nonce.
  const params = new URLSearchParams({
    redirect: saveSelfPage,
    email,
    commitment: identity.commitment.toString(),
  }).toString();
  const magicLink = `${config.passportServer}/zuzalu/new-participant?${params}`;

  return (
    <>
      <Spacer h={24} />
      <TextCenter>
        <img src="/zuzalu.png" alt="Zuzalu logo" width={128} height={128} />
      </TextCenter>
      <Spacer h={24} />
      <TextSecondary>
        <p>Generating passport...</p>
        <p>Sending email...</p>
      </TextSecondary>
      <Spacer h={24} />
      {magicLink && (
        <p>
          Dev mode. <a href={magicLink}>Email magic link.</a>
        </p>
      )}
      <Spacer h={24} />
      <p>Sent. Check your email.</p>
      <p>You can close this page now.</p>
    </>
  );
}
