import {
  ConfirmEmailResult,
  requestConfirmationEmail,
  requestDownloadAndDecryptStorage,
  requestPasswordSalt,
  requestVerifyToken
} from "@pcd/passport-interface";
import { ZUPASS_SENDER_EMAIL } from "@pcd/util";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { appConfig } from "../../../src/appConfig";
import { useDispatch, useIdentity, useQuery } from "../../../src/appHooks";
import { err } from "../../../src/util";
import { BigInput, CenterColumn, H2, HR, Spacer, TextCenter } from "../../core";
import { Button, LinkButton } from "../../core/Button";
import { ConfirmationCodeInput } from "../../core/Input";
import { AppContainer } from "../../shared/AppContainer";
import { InlineError } from "../../shared/InlineError";
import { ResendCodeButton } from "../../shared/ResendCodeButton";
import { ScreenLoader } from "../../shared/ScreenLoader";

/**
 * Show the user that we're generating their Zupass. Direct them to the email
 * verification link.
 */
export function NewPassportScreen() {
  const query = useQuery();
  const email = query.get("email");

  useEffect(() => {
    if (!email) {
      window.location.hash = "#/";
    }
  }, [email]);

  if (!email) {
    return null;
  }

  return <SendEmailVerification email={email} />;
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
  const [token, setToken] = useState("");

  const verifyToken = useCallback(
    async (token: string) => {
      if (verifyingCode) return;

      if (token === "") {
        setError("Enter confirmation code");
        return;
      }

      setVerifyingCode(true);
      const verifyTokenResult = await requestVerifyToken(
        appConfig.zupassServer,
        email,
        token
      );

      if (verifyTokenResult.success) {
        const encryptionKey = verifyTokenResult.value?.encryptionKey;
        if (encryptionKey) {
          const storageResult = await requestDownloadAndDecryptStorage(
            appConfig.zupassServer,
            encryptionKey
          );

          if (!storageResult.success) {
            setError("An error occurred while downloading encrypted storage.");
          }

          await dispatch({
            type: "load-after-login",
            storage: storageResult.value,
            encryptionKey
          });
        } else {
          window.location.hash = `#/privacy-notice?email=${encodeURIComponent(
            email
          )}&token=${encodeURIComponent(token)}`;
        }
      } else {
        setError("Invalid confirmation code");
      }

      setVerifyingCode(false);
    },
    [email, verifyingCode, dispatch]
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
  const onSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      verifyToken(token);
    },
    [verifyToken, token]
  );

  let content = null;

  if (verifyingCode) {
    content = <ScreenLoader text="Verifying token..." />;
  } else if (loadingSalt) {
    content = <ScreenLoader text="Loading account information..." />;
  } else if (emailSending) {
    content = (
      <ScreenLoader text="Checking if you already have an account..." />
    );
  } else if (emailSent) {
    content = (
      <>
        <Spacer h={64} />
        <TextCenter>
          <H2>Enter Confirmation Code</H2>
          <Spacer h={24} />
          Check your inbox for an email from <span>{ZUPASS_SENDER_EMAIL}</span>.
          Use the most recent code you received to continue.
        </TextCenter>
        <Spacer h={24} />

        <CenterColumn>
          <form onSubmit={onSubmit}>
            <BigInput value={email} disabled={true} />
            <Spacer h={8} />
            <ConfirmationCodeInput
              value={token}
              onChange={(e) => setToken(e.target.value.replace(/\D/g, ""))}
              autoFocus
              placeholder="code from email"
            />
            <InlineError error={error} />
            <Spacer h={8} />
            <Button type="submit">Verify</Button>
            <Spacer h={24} />
            <HR />
            <Spacer h={24} />
            <ResendCodeButton email={email} />
            <Spacer h={8} />
            <LinkButton to={"/"}>Cancel</LinkButton>
          </form>
        </CenterColumn>
      </>
    );
  }

  return <AppContainer bg="primary">{content}</AppContainer>;
}
