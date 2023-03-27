import { Identity } from "@semaphore-protocol/identity";
import * as React from "react";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { config } from "../../src/config";
import { DispatchContext } from "../../src/dispatch";
import {
  BackgroundGlow,
  BigInput,
  CenterColumn,
  H1,
  H2,
  HR,
  Spacer,
  TextCenter,
  ZuLogo,
} from "../core";
import { Button, LinkButton } from "../core/Button";
import { AppContainer } from "../shared/AppContainer";

/**
 * Show the user that we're generating their passport. Direct them to the email
 * verification link.
 */
export function NewPassportScreen() {
  const [state, dispatch] = useContext(DispatchContext);
  const { identity, pendingAction } = state;
  if (pendingAction == null || pendingAction.type !== "new-passport") {
    window.location.hash = "#/";
    window.location.reload();
    return null;
  }
  const { email } = pendingAction;

  // Request email verification from the server.
  const [emailSent, setEmailSent] = useState(false);
  useEffect(() => {
    requestLoginCode(email, identity)
      .then((devToken: string | undefined) => {
        if (devToken === undefined) {
          setEmailSent(true);
        } else {
          dispatch({ type: "login", email, token: devToken });
        }
      })
      .catch((err) => {
        const { message } = err;
        if ((message as string).includes("already registered")) {
          dispatch({
            type: "error",
            error: {
              title: "Email failed",
              message: (
                <>
                  {message} <br /> <br />
                  You have already logged in on another device or browser. Copy
                  the sync key from the settings page, using the browser you've
                  already logged in on.
                  <br />
                  <br />
                  For example, if you generated a passport from inside an email
                  mobile app, you should click on the passport link in your
                  invite email again to open your logged in passport. Then,
                  click the gear icon in the top right, copy your sync key,
                  click Sync Existing Passport on this page, and finally paste
                  in your sync key.
                </>
              ),
            },
          });
        } else {
          dispatch({
            type: "error",
            error: { title: "Email failed", message },
          });
        }
      });
  }, [email, setEmailSent]);

  // Verify the code the user entered.
  const inRef = useRef<HTMLInputElement>();
  const login = useCallback(() => {
    const token = inRef.current?.value || "";
    dispatch({ type: "login", email, token });
  }, []);

  return (
    <AppContainer bg="primary">
      <BackgroundGlow
        y={224}
        from="var(--bg-lite-primary)"
        to="var(--bg-dark-primary)"
      >
        <Spacer h={64} />
        <TextCenter>
          <H1>PASSPORT</H1>
          <Spacer h={24} />
          <ZuLogo />
          <Spacer h={24} />
          <H2>ZUZALU</H2>
          <Spacer h={48} />
          <PItalic>Generating passport...</PItalic>
          <PItalic>Sending verification email...</PItalic>
          <PHeavy>{emailSent ? "Check your email." : <>&nbsp;</>}</PHeavy>
        </TextCenter>
        <Spacer h={24} />
        <CenterColumn w={280}>
          <BigInput ref={inRef} placeholder="code from email" />
          <Spacer h={8} />
          <Button onClick={login}>Verify</Button>
        </CenterColumn>
        <Spacer h={48} />
        <HR />
        <Spacer h={24} />
        <CenterColumn w={280}>
          <LinkButton to={"/"}>Cancel</LinkButton>
        </CenterColumn>
        <Spacer h={24} />
      </BackgroundGlow>
    </AppContainer>
  );
}

/**
 * Server checks that email address is on the list, then sends the code. In the
 * case that verification emails are disabled on the server, also returns the
 * confirmation code, so the client can automatically 'verify' the user.
 */
async function requestLoginCode(
  email: string,
  identity: Identity
): Promise<string | undefined> {
  console.log(`Requesting email verification for ${email}...`);
  const params = new URLSearchParams({
    email,
    commitment: identity.commitment.toString(),
  }).toString();
  const url = `${config.passportServer}/zuzalu/send-login-email?${params}`;
  const res = await fetch(url, { method: "POST" });
  const responseText = await res.text();

  try {
    // in the case that email verification is disabled, we get back
    // the token in the response to this request
    const parsedResponse = JSON.parse(responseText);
    if (parsedResponse.token) {
      return parsedResponse.token;
    }
  } catch (e) {}

  if (res.ok) return undefined;

  throw new Error(responseText);
}

const PItalic = styled.p`
  font-size: 20px;
  font-weight: 300;
  font-style: italic;
  color: rgba(var(--white-rgb), 0.5);
  line-height: 2;
`;

const PHeavy = styled.p`
  font-size: 20px;
  font-weight: 400;
  line-height: 2;
  color: var(--accent-lite);
`;
