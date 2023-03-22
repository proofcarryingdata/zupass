import * as React from "react";
import { useContext, useEffect, useState } from "react";
import styled from "styled-components";
import { config } from "../../src/config";
import { DispatchContext } from "../../src/dispatch";
import {
  BackgroundGlow,
  CenterColumn,
  H1,
  H2,
  HR,
  Spacer,
  TextCenter,
  ZuLogo,
} from "../core";
import { LinkButton } from "../core/Button";
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
    console.log(`Requesting email verification for ${email}...`);
    const params = new URLSearchParams({
      email,
      commitment: identity.commitment.toString(),
    }).toString();
    const url = `${config.passportServer}/zuzalu/register?${params}`;
    fetch(url, { method: "POST" })
      .then(async (res) => {
        if (res.ok) {
          setEmailSent(true);
        } else {
          const message = await res.text();
          dispatch({
            type: "error",
            error: { title: "Email failed", message },
          });
        }
      })
      .catch((err) => {
        const { message } = err;
        dispatch({ type: "error", error: { title: "Email failed", message } });
      });
  }, [email, setEmailSent]);

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
        <Spacer h={48} />
        <HR />
        <Spacer h={24} />
        <CenterColumn w={280}>
          <LinkButton to={"/sync-existing"}>Sync Existing Passport</LinkButton>
          <Spacer h={8} />
          <LinkButton to={"/scan-and-verify"}>Verify a Passport</LinkButton>
        </CenterColumn>
        <Spacer h={24} />
      </BackgroundGlow>
    </AppContainer>
  );
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
