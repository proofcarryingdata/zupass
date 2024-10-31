import {
  CredentialManager,
  requestChangeUserEmail
} from "@pcd/passport-interface";
import { ErrorMessage, LinkButton } from "@pcd/passport-ui";
import { getErrorMessage } from "@pcd/util";
import { validate } from "email-validator";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { appConfig } from "../../src/appConfig";
import {
  useDispatch,
  usePCDCollection,
  useSelf,
  useStateContext
} from "../../src/appHooks";
import { getEmailUpdateErrorMessage } from "../../src/errorMessage";
import { useSyncE2EEStorage } from "../../src/useSyncE2EEStorage";
import {
  BigInput,
  Button,
  CenterColumn,
  H2,
  HR,
  Spacer,
  TextCenter
} from "../core";
import { RippleLoader } from "../core/RippleLoader";
import { MaybeModal } from "../modals/Modal";
import { AppContainer } from "../shared/AppContainer";

export function ChangeEmailScreen(): JSX.Element | null {
  useSyncE2EEStorage();
  const self = useSelf();
  const stateContext = useStateContext();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [confirmationCode, setConfirmationCode] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [finished, setFinished] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const pcds = usePCDCollection();

  useEffect(() => {
    if (!self) {
      navigate("/login", { replace: true });
    }
  }, [self, navigate]);

  const onSendConfirmationCode = useCallback(async () => {
    if (loading || !self) return;

    if (!validate(newEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const credential = await new CredentialManager(
        stateContext.getState().identityV3,
        pcds,
        stateContext.getState().credentialCache
      ).requestCredential({
        signatureType: "sempahore-signature-pcd",
        pcdType: "email-pcd"
      });

      const result = await requestChangeUserEmail(
        appConfig.zupassServer,
        self.emails[0],
        newEmail,
        credential
      );

      if (!result.success) {
        setError(getEmailUpdateErrorMessage(result.error));
        setLoading(false);
        return;
      }

      if (result.value.token) {
        setConfirmationCode(result.value.token);
      }

      setCodeSent(true);
      setLoading(false);
    } catch (e) {
      setLoading(false);
      setError(getEmailUpdateErrorMessage(getErrorMessage(e)));
    }
  }, [loading, self, stateContext, pcds, newEmail]);

  const onChangeEmail = useCallback(async () => {
    if (loading || !self) return;

    if (
      !confirm(
        "Are you sure you want to change your email? This action" +
          " may result in your tickets with your old email being deleted!"
      )
    ) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const credential = await new CredentialManager(
        stateContext.getState().identityV3,
        pcds,
        stateContext.getState().credentialCache
      ).requestCredential({
        signatureType: "sempahore-signature-pcd",
        pcdType: "email-pcd"
      });

      const result = await requestChangeUserEmail(
        appConfig.zupassServer,
        self.emails[0],
        newEmail,
        credential,
        confirmationCode
      );

      if (!result.success) {
        setError(getEmailUpdateErrorMessage(result.error));
        setLoading(false);
        return;
      }

      if (!result.value.newEmailList) {
        setError("Couldn't change email, please try again later.");
        setLoading(false);
        return;
      }

      await dispatch({
        type: "set-self",
        self: { ...self, emails: result.value.newEmailList }
      });
      stateContext.update({
        extraSubscriptionFetchRequested: true
      });

      setTimeout(() => {
        setFinished(true);
        setLoading(false);
      }, 1000);
    } catch (e) {
      setLoading(false);
      setError(getEmailUpdateErrorMessage(getErrorMessage(e)));
    }
  }, [loading, self, stateContext, pcds, newEmail, confirmationCode, dispatch]);

  let content = null;

  if (!self) {
    return null;
  }

  if (loading) {
    content = (
      <>
        <Spacer h={128} />
        <RippleLoader />
        <Spacer h={24} />
        <TextCenter>
          {codeSent ? "Changing your email..." : "Sending confirmation code..."}
        </TextCenter>
      </>
    );
  } else if (finished) {
    content = (
      <TextCenter>
        <H2>Changed Email</H2>
        <Spacer h={24} />
        You've successfully changed your email to '{self.emails[0]}'.
        <Spacer h={24} />
        <LinkButton to={"/"} $primary={true}>
          Done
        </LinkButton>
      </TextCenter>
    );
  } else {
    content = (
      <>
        <TextCenter>
          <H2>Change Email</H2>
          <Spacer h={24} />
          Enter your new email address. We'll send a confirmation code to verify
          it.
          <Spacer h={8} />
          {self.emails.length === 1 ? (
            <>
              Your current account email is:{" "}
              {self.emails.map((e) => `'${e}'`).join(", ")}
            </>
          ) : (
            <>
              Your current emails are:{" "}
              {self.emails.map((e) => `'${e}'`).join(", ")}
            </>
          )}
        </TextCenter>
        <Spacer h={24} />
        <BigInput
          placeholder="New email address"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
        />
        <Spacer h={16} />
        {!codeSent ? (
          <>
            {error && (
              <>
                <ErrorMessage>{error}</ErrorMessage>
                <Spacer h={16} />
              </>
            )}
            <Button
              disabled={newEmail.length === 0}
              onClick={onSendConfirmationCode}
            >
              Send Confirmation Code
            </Button>
          </>
        ) : (
          <>
            {error && (
              <>
                <ErrorMessage>{error}</ErrorMessage>
                <Spacer h={16} />
              </>
            )}
            <BigInput
              placeholder="Confirmation code"
              value={confirmationCode}
              onChange={(e) => setConfirmationCode(e.target.value)}
            />
            <Spacer h={16} />
            <Button onClick={onChangeEmail}>Change Email</Button>
          </>
        )}
        <Spacer h={24} />
        <HR />
        <Spacer h={24} />
        <LinkButton to={"/"}>Cancel</LinkButton>
      </>
    );
  }
  return (
    <>
      <MaybeModal />
      <AppContainer bg="primary">
        <Spacer h={64} />
        <CenterColumn>{content}</CenterColumn>
      </AppContainer>
    </>
  );
}
