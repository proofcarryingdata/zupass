import * as React from "react";
import { useContext } from "react";
import { DispatchContext } from "../../src/dispatch";
import { Spacer, TextCenter, TextSecondary } from "../core";

/**
 * Show the user that we're generating their passport. Direct them to the email
 * verification link.
 */
export function NewPassportScreen() {
  const [state] = useContext(DispatchContext);
  const { identity } = state;

  let saveSelfPage = encodeURIComponent(window.location.origin + "#/save-self");
  const npp = "http://localhost:3002/zuzalu/new-participant";
  const magicLink =
    identity &&
    `${npp}?redirect=${saveSelfPage}&commitment=${identity.commitment}`;

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
