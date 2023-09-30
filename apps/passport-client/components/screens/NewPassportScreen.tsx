import {
  ConfirmEmailResult,
  requestConfirmationEmail,
  requestPasswordSalt,
  requestVerifyToken
} from "@pcd/passport-interface";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { appConfig } from "../../src/appConfig";
import { useDispatch, useIdentity, usePendingAction } from "../../src/appHooks";
import { err } from "../../src/util";
import {
  BackgroundGlow,
  BigInput,
  CenterColumn,
  H2,
  HR,
  Spacer,
  TextCenter
} from "../core";
import { Button, LinkButton } from "../core/Button";
import { RippleLoader } from "../core/RippleLoader";
import { AppContainer } from "../shared/AppContainer";
import { ResendCodeButton } from "../shared/ResendCodeButton";

/**
 * Show the user that we're generating their Zupass. Direct them to the email
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
  const [error, setError] = useState<string | undefined>();
  const [triedSendingEmail, setTriedSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [loadingSalt, setLoadingSalt] = useState(false);

  const verifyToken = useCallback(
    async (token: string) => {
      if (verifyingCode) return;

      setVerifyingCode(true);
      const verifyTokenResult = await requestVerifyToken(
        appConfig.zupassServer,
        email,
        token
      );
      setVerifyingCode(false);
      if (verifyTokenResult.success) {
        window.location.hash = `#/create-password?email=${encodeURIComponent(
          email
        )}&token=${encodeURIComponent(token)}`;
        return;
      } else {
        setError("Invalid confirmation code");
      }
    },
    [email, verifyingCode]
  );

  const handleConfirmationEmailResult = useCallback(
    async (result: ConfirmEmailResult) => {
      if (!result.success) {
        if (!result.error.includes("already registered")) {
          return err(dispatch, "Email failed", result.error);
        }

        setLoadingSalt(true);
        const saltResult = await requestPasswordSalt(
          appConfig.zupassServer,
          email
        );
        setLoadingSalt(false);

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
        verifyToken(result.value.devToken);
      } else {
        setEmailSent(true);
      }
    },
    [dispatch, email, identity.commitment, verifyToken]
  );

  const doRequestConfirmationEmail = useCallback(async () => {
    setEmailSending(true);
    const confirmationEmailResult = await requestConfirmationEmail(
      appConfig.zupassServer,
      email,
      identity.commitment.toString(),
      false
    );
    setEmailSending(false);

    handleConfirmationEmailResult(confirmationEmailResult);
  }, [email, handleConfirmationEmailResult, identity.commitment]);

  useEffect(() => {
    if (triedSendingEmail) return;
    setTriedSendingEmail(true);
    doRequestConfirmationEmail();
  }, [triedSendingEmail, doRequestConfirmationEmail]);

  // Verify the code the user entered.
  const inRef = useRef<HTMLInputElement>();
  const onSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const token = inRef.current?.value || "";
      verifyToken(token);
    },
    [verifyToken]
  );

  let content = null;

  if (loadingSalt) {
    content = (
      <>
        <Spacer h={128} />
        <TextCenter>Loading account information...</TextCenter>
        <Spacer h={32} />
        <RippleLoader />
      </>
    );
  } else if (emailSending) {
    content = (
      <>
        <Spacer h={128} />
        <TextCenter>Checking if you already have an account...</TextCenter>
        <Spacer h={32} />
        <RippleLoader />
      </>
    );
  } else if (emailSent) {
    content = (
      <>
        <Spacer h={64} />
        <TextCenter>
          <H2>Enter Code</H2>
          <Spacer h={24} />
          Check your inbox for an email from <span>passport@0xparc.org</span>.
          Use the most recent code you received to continue.
        </TextCenter>
        <Spacer h={32} />
        <form onSubmit={onSubmit}>
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
        </form>
      </>
    );
  }

  return (
    <AppContainer bg="primary">
      <BackgroundGlow
        y={224}
        from="var(--bg-lite-primary)"
        to="var(--bg-dark-primary)"
      >
        <CenterColumn w={280}>{content}</CenterColumn>

        {!verifyingCode && emailSent && (
          <>
            <Spacer h={24} />
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
