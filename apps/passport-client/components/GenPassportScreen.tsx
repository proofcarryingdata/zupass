import { Identity } from "@semaphore-protocol/identity";
import * as React from "react";
import { Button, Center, Spacer } from "./core";

/**
 * Show the user that we're generating their passport. Direct them to the email
 * verification link.
 */
export function GenPassportScreen({ identity }: { identity?: Identity }) {
  let saveSelfPage = window.location.origin;
  const npp = "http://localhost:3002/zuzalu/new-participant";
  const magicLink =
    identity &&
    `${npp}?redirect=${saveSelfPage}&commitment=${identity.commitment}`;

  return (
    <>
      <Spacer h={24} />
      <Center>
        <img src="/zuzalu.png" alt="Zuzalu logo" width={128} height={128} />
      </Center>
      <Spacer h={24} />
      <p>Generating passport...</p>
      <p>Sending email...</p>
      {magicLink && (
        <p>
          Dev mode. <a href={magicLink}>Email magic link.</a>
        </p>
      )}
      <Spacer h={24} />
      <Button onClick={closePage}>Close Page</Button>
    </>
  );
}

function closePage() {
  window.close();
}
