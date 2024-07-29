import {
  CredentialManager,
  RemoveUserEmailRequest
} from "@pcd/passport-interface";
import { LinkButton } from "@pcd/passport-ui";
import { SerializedPCD } from "@pcd/pcd-types";
import { SemaphoreSignaturePCD } from "@pcd/semaphore-signature-pcd";
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
import { useSyncE2EEStorage } from "../../src/useSyncE2EEStorage";
import { Button, CenterColumn, H2, HR, Spacer, TextCenter } from "../core";
import { RippleLoader } from "../core/RippleLoader";
import { MaybeModal } from "../modals/Modal";
import { AppContainer } from "../shared/AppContainer";

export function RemoveEmailScreen(): JSX.Element | null {
  useSyncE2EEStorage();
  const self = useSelf();
  const stateContext = useStateContext();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [emailToRemove, setEmailToRemove] = useState("");
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
    setLoading(true);
    try {
      const { identity, credentialCache } = stateContext.getState();
      const credentialManager = new CredentialManager(
        identity,
        pcds,
        credentialCache
      );

      const pcd: SerializedPCD<SemaphoreSignaturePCD> =
        await credentialManager.requestCredential({
          signatureType: "sempahore-signature-pcd"
        });

      const response = await fetch(
        `${appConfig.zupassServer}/account/remove-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            emailToRemove,
            pcd
          } as RemoveUserEmailRequest)
        }
      );

      if (!response.ok) {
        throw new Error(await response.text());
      }

      // Update local state
      dispatch({
        type: "set-self",
        self: {
          ...self,
          emails: self.emails.filter((e) => e !== emailToRemove)
        }
      });

      setFinished(true);
      setLoading(false);
    } catch (e) {
      console.log("error removing email", e);
      setLoading(false);
      setError(getErrorMessage(e));
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
          <H2>Remove Email</H2>
          <Spacer h={24} />
          Select the email address you want to remove.
        </TextCenter>
        <Spacer h={24} />
        <Select
          value={emailToRemove}
          onChange={(e) => setEmailToRemove(e.target.value)}
        >
          <option value="">Select an email to remove</option>
          {self.emails.map((email) => (
            <option key={email} value={email}>
              {email}
            </option>
          ))}
        </Select>
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
      <AppContainer bg="gray">
        <Spacer h={64} />
        <CenterColumn>{content}</CenterColumn>
      </AppContainer>
    </>
  );
}
