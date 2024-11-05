import {
  CredentialManager,
  requestRemoveUserEmail
} from "@pcd/passport-interface";
import { LinkButton } from "@pcd/passport-ui";
import { getErrorMessage } from "@pcd/util";
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
import { Button, CenterColumn, H2, HR, Spacer, TextCenter } from "../core";
import { RippleLoader } from "../core/RippleLoader";
import { MaybeModal } from "../modals/Modal";
import { AppContainer } from "../shared/AppContainer";
import Select from "../shared/Select";

export function RemoveEmailScreen(): JSX.Element | null {
  useSyncE2EEStorage();
  const self = useSelf();
  const stateContext = useStateContext();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [emailToRemove, setEmailToRemove] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [finished, setFinished] = useState(false);
  const pcds = usePCDCollection();

  useEffect(() => {
    if (!self) {
      navigate("/login", { replace: true });
    }
  }, [self, navigate]);

  const onRemoveEmail = useCallback(async () => {
    if (loading || !self || !emailToRemove) return;

    if (
      !confirm(
        "Are you sure you want to remove this email? This action" +
          " may result in your tickets with that email being deleted!"
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

      const response = await requestRemoveUserEmail(
        appConfig.zupassServer,
        emailToRemove,
        credential
      );

      if (!response.success) {
        setLoading(false);
        setError(getEmailUpdateErrorMessage(response.error));
        return;
      }

      await dispatch({
        type: "set-self",
        self: {
          ...self,
          emails: response.value.newEmailList
        }
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
  }, [loading, self, stateContext, pcds, emailToRemove, dispatch]);

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
        <TextCenter>Removing email...</TextCenter>
      </>
    );
  } else if (finished) {
    content = (
      <TextCenter>
        <H2>Email Removed</H2>
        <Spacer h={24} />
        You've successfully removed the email address.
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
  } else if (self.emails.length === 1) {
    content = (
      <TextCenter>
        <H2>Can't Remove Email</H2>
        <Spacer h={24} />
        You cannot remove the only email associated with your account. If you'd
        like to delete your account you can do so via the settings pane.
        <Spacer h={24} />
        <LinkButton to={"/"} $primary={true}>
          Back
        </LinkButton>
      </TextCenter>
    );
  } else {
    content = (
      <>
        <TextCenter>
          <H2>Remove Email</H2>
          <Spacer h={24} />
          Select the email address you want to remove.
        </TextCenter>
        <Spacer h={24} />
        <Select
          value={
            emailToRemove
              ? { id: emailToRemove, label: emailToRemove }
              : undefined
          }
          onChange={(v) => setEmailToRemove(v?.id)}
          options={self.emails.map((e) => ({ id: e, label: e }))}
        />
        <Spacer h={16} />
        <Button onClick={onRemoveEmail} disabled={!emailToRemove}>
          Remove Email
        </Button>
        {error && (
          <>
            <Spacer h={16} />
            <TextCenter style={{ color: "red" }}>{error}</TextCenter>
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
