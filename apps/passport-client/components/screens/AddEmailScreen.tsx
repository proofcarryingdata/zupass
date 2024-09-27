import {
  CredentialManager,
  requestAddUserEmail
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

export function AddEmailScreen(): JSX.Element | null {
  useSyncE2EEStorage();
  const self = useSelf();
  const stateContext = useStateContext();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [confirmationCode, setConfirmationCode] = useState<string>("");
  const [error, setError] = useState<string | undefined>();
  const [finished, setFinished] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const pcds = usePCDCollection();

  useEffect(() => {
    if (!self) {
      navigate("/login", { replace: true });
    }
  }, [self, navigate]);

  const sendConfirmationCode = useCallback(async () => {
    if (loading || !self) return;

    if (!validate(newEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const credential = await new CredentialManager(
        stateContext.getState().identityV3,
        pcds,
        stateContext.getState().credentialCache
      ).requestCredential({
        signatureType: "sempahore-signature-pcd",
        pcdType: "email-pcd"
      });

      const response = await requestAddUserEmail(
        appConfig.zupassServer,
        newEmail,
        credential
      );

      if (response.success && response.value.token) {
        setConfirmationCode(response.value.token);
      } else if (!response.success) {
        setError(getEmailUpdateErrorMessage(response.error));
        setLoading(false);
      }

      setCodeSent(true);
      setLoading(false);
    } catch (e) {
      setLoading(false);
      setError(getEmailUpdateErrorMessage(getErrorMessage(e)));
    }
  }, [loading, self, stateContext, pcds, newEmail]);

  const onAddEmail = useCallback(async () => {
    if (loading || !self) return;

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

      const response = await requestAddUserEmail(
        appConfig.zupassServer,
        newEmail,
        credential,
        confirmationCode
      );

      if (!response.success) {
        setError(getEmailUpdateErrorMessage(response.error));
        setLoading(false);
        return;
      }

      if (response.value.newEmailList) {
        await dispatch({
          type: "set-self",
          self: { ...self, emails: [...response.value.newEmailList] }
        });
        stateContext.update({
          extraSubscriptionFetchRequested: true
        });
      } else {
        setError(
          `Couldn't add '${newEmail}', please wait and try again later.`
        );
      }

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
          {codeSent ? "Adding your email..." : "Sending confirmation code..."}
        </TextCenter>
      </>
    );
  } else if (finished) {
    content = (
      <TextCenter>
        <H2>Added Email</H2>
        <Spacer h={24} />
        You've added a new email successfully.
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
          <H2>Add Email</H2>
          <Spacer h={24} />
          Enter a new email address to add to your account. We'll send a
          confirmation code to verify it.
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
          disabled={codeSent}
          onChange={(e) => setNewEmail(e.target.value)}
        />
        <Spacer h={16} />
        {!codeSent ? (
          <Button disabled={newEmail === ""} onClick={sendConfirmationCode}>
            Get Confirmation Code
          </Button>
        ) : (
          <>
            <BigInput
              placeholder="Confirmation code"
              value={confirmationCode}
              onChange={(e) => setConfirmationCode(e.target.value)}
            />
            <Spacer h={16} />
            <Button onClick={onAddEmail}>Add Email</Button>
          </>
        )}
        {error && (
          <>
            <Spacer h={16} />
            <ErrorMessage>{error}</ErrorMessage>
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
