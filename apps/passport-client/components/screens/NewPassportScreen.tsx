import { useCallback, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { requestLoginCode } from "../../src/api/user";
import { appConfig } from "../../src/appConfig";
import { useDispatch, useIdentity, usePendingAction } from "../../src/appHooks";
import { err } from "../../src/util";
import {
  BackgroundGlow,
  BigInput,
  CenterColumn,
  H1,
  H2,
  HR,
  Spacer,
  TextCenter,
  ZuLogo
} from "../core";
import { Button, LinkButton } from "../core/Button";
import { RippleLoader } from "../core/RippleLoader";
import { AppContainer } from "../shared/AppContainer";

/**
 * Show the user that we're generating their passport. Direct them to the email
 * verification link.
 */
export function NewPassportScreen() {
  const pendingAction = usePendingAction();

  useEffect(() => {
    if (pendingAction == null || pendingAction.type !== "new-passport") {
      window.location.hash = "#/";
      window.location.reload();
    }
  }, [pendingAction]);

  if (pendingAction == null || pendingAction.type !== "new-passport") {
    return null;
  }

  return <SendEmailVerification email={pendingAction.email} />;
}

function SendEmailVerification({ email }: { email: string }) {
  const identity = useIdentity();
  const dispatch = useDispatch();
  const [triedSendingEmail, setTriedSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);

  useEffect(() => {
    if (triedSendingEmail) return;
    setTriedSendingEmail(true);

    const handleResult = (devToken: string | undefined) => {
      if (devToken === undefined) {
        setEmailSent(true);
      } else {
        dispatch({ type: "login", email, token: devToken });
      }
    };

    requestLoginCode(email, identity.commitment.toString())
      .then(handleResult)
      .catch((e) => {
        const message = e.message as string;
        if (message.includes("already registered")) {
          window.location.href = `#/already-registered?email=${encodeURIComponent(
            email
          )}&identityCommitment=${encodeURIComponent(
            identity.commitment.toString()
          )}`;
        } else {
          err(dispatch, "Email failed", message);
        }
      });
  }, [setEmailSent, dispatch, identity, triedSendingEmail, email]);

  // Verify the code the user entered.
  const inRef = useRef<HTMLInputElement>();
  const verify = useCallback(async () => {
    const token = inRef.current?.value || "";
    setVerifyingCode(true);
    await dispatch({ type: "login", email, token });
    setVerifyingCode(false);
  }, [dispatch, email]);

  return (
    <AppContainer bg="primary">
      <BackgroundGlow
        y={224}
        from="var(--bg-lite-primary)"
        to="var(--bg-dark-primary)"
      >
        <Spacer h={64} />
        <TextCenter>
          <Header />
          <RippleLoader />
          <PHeavy>{emailSent ? "Check your email." : <>&nbsp;</>}</PHeavy>
        </TextCenter>
        <Spacer h={24} />
        <CenterColumn w={280}>
          {emailSent && (
            <>
              {" "}
              <BigInput
                disabled={verifyingCode}
                ref={inRef}
                placeholder="code from email"
              />
              <Spacer h={8} />
            </>
          )}
          {verifyingCode && (
            <div>
              <RippleLoader />
            </div>
          )}
          {!verifyingCode && emailSent && (
            <Button onClick={verify}>Verify</Button>
          )}
        </CenterColumn>
        {!verifyingCode && emailSent && (
          <>
            <Spacer h={48} />
            <HR />
            <Spacer h={24} />
            <CenterColumn w={280}>
              <LinkButton to={"/"}>Cancel</LinkButton>
            </CenterColumn>
          </>
        )}

        <Spacer h={24} />
      </BackgroundGlow>
    </AppContainer>
  );
}

function Header() {
  if (!appConfig.isZuzalu) {
    return (
      <>
        <H1>PCDPASS</H1>
        <Spacer h={48} />
      </>
    );
  } else {
    return (
      <>
        <H1>PASSPORT</H1>
        <Spacer h={24} />
        <ZuLogo />
        <Spacer h={24} />
        <H2>ZUZALU</H2>
        <Spacer h={48} />
      </>
    );
  }
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
