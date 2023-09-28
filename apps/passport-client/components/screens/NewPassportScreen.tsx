import {
  ConfirmEmailResult,
  requestConfirmationEmail,
  requestPasswordSalt
} from "@pcd/passport-interface";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import styled from "styled-components";
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
import { ResendCodeButton } from "../shared/ResendCodeButton";

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

  const handleConfirmationEmailResult = useCallback(
    async (result: ConfirmEmailResult) => {
      if (!result.success) {
        if (!result.error.includes("already registered")) {
          return err(dispatch, "Email failed", result.error);
        }

        const saltResult = await requestPasswordSalt(
          appConfig.passportServer,
          email
        );

        if (saltResult.success) {
          window.location.href = `#/already-registered?email=${encodeURIComponent(
            email
          )}&identityCommitment=${encodeURIComponent(
            identity.commitment.toString()
          )}&salt=${encodeURIComponent(saltResult.value)}`;
        } else {
          err(dispatch, "Email failed", saltResult.error);
        }
      } else if (result.value?.devToken != null) {
        dispatch({ type: "verify-token", email, token: result.value.devToken });
      } else {
        setEmailSent(true);
      }
    },
    [dispatch, email, identity.commitment]
  );

  const doRequestConfirmationEmail = useCallback(async () => {
    const confirmationEmailResult = await requestConfirmationEmail(
      appConfig.passportServer,
      appConfig.isZuzalu,
      email,
      identity.commitment.toString(),
      false
    );

    handleConfirmationEmailResult(confirmationEmailResult);
  }, [email, handleConfirmationEmailResult, identity.commitment]);

  useEffect(() => {
    if (triedSendingEmail) return;
    setTriedSendingEmail(true);
    doRequestConfirmationEmail();
  }, [triedSendingEmail, doRequestConfirmationEmail]);

  // Verify the code the user entered.
  const inRef = useRef<HTMLInputElement>();
  const verify = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (verifyingCode) return;
      const token = inRef.current?.value || "";
      setVerifyingCode(true);
      await dispatch({ type: "verify-token", email, token });
      setVerifyingCode(false);
    },
    [dispatch, email, verifyingCode]
  );

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
          <PHeavy>
            {emailSent ? (
              "Check your email. Please use the most recent code you have received."
            ) : (
              <>&nbsp;</>
            )}
          </PHeavy>
        </TextCenter>
        <Spacer h={24} />
        <form onSubmit={verify}>
          <CenterColumn w={280}>
            {emailSent && (
              <>
                <BigInput
                  disabled={verifyingCode}
                  ref={inRef}
                  autoFocus
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
              <>
                <Button type="submit">Verify</Button>
                <Spacer h={8} />
                <ResendCodeButton email={email} />
              </>
            )}
          </CenterColumn>
        </form>
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
        <Spacer h={24} />
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

const PHeavy = styled.p`
  font-size: 20px;
  font-weight: 400;
  line-height: 2;
  color: var(--accent-lite);
`;
