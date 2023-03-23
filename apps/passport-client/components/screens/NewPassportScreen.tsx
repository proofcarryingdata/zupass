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

const LOGIN_CODE_LENGTH = 6;

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
      .then(() => setEmailSent(true))
      .catch((err) => {
        const { message } = err;
        dispatch({ type: "error", error: { title: "Email failed", message } });
      });
  }, [email, setEmailSent]);

  // Verify the code the user entered.
  const inRef = useRef<HTMLInputElement>();
  const login = useCallback(() => {
    const token = inRef.current?.value || "";
    if (token.length !== LOGIN_CODE_LENGTH || !/^\d+$/.test(token)) {
      window.alert(`Enter your ${LOGIN_CODE_LENGTH}-digit code.`);
      return;
    }
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

/** Server checks that email address is on the list, then sends the code. */
async function requestLoginCode(email: string, identity: Identity) {
  console.log(`Requesting email verification for ${email}...`);
  const params = new URLSearchParams({
    email,
    commitment: identity.commitment.toString(),
  }).toString();
  const url = `${config.passportServer}/zuzalu/register?${params}`;
  const res = await fetch(url, { method: "POST" });
  if (res.ok) return;
  throw new Error(await res.text());
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
