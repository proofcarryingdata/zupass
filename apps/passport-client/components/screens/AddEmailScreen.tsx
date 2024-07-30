import {
  CredentialManager,
  requestAddUserEmail
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
  const [confirmationCode, setConfirmationCode] = useState<
    string | undefined
  >();
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

      const response = await requestAddUserEmail(
        appConfig.zupassServer,
        newEmail,
        pcd
      );

      if (response.success) {
        if (response.value.token) {
          setConfirmationCode(response.value.token);
        }
      } else {
        setError(response.error);
      }

      setCodeSent(true);
      setLoading(false);
    } catch (e) {
      console.log("error sending confirmation code", e);
      setLoading(false);
      setError(getErrorMessage(e));
    }
  }, [loading, self, stateContext, pcds, newEmail]);

  const onAddEmail = useCallback(async () => {
    if (loading || !self) return;
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

      const response = await requestAddUserEmail(
        appConfig.zupassServer,
        newEmail,
        pcd,
        confirmationCode
      );

      console.log("RESRES", response);

      if (!response.success) {
        alert(JSON.stringify(response, null, 2));
        return;
      }

      // Update local state
      dispatch({
        type: "set-self",
        self: { ...self, emails: [...(self.emails ?? []), newEmail] }
      });

      setFinished(true);
      setLoading(false);
    } catch (e) {
      console.log("error adding email", e);
      setLoading(false);
      setError(getErrorMessage(e));
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
        </TextCenter>
        <Spacer h={24} />
        <BigInput
          placeholder="New email address"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
        />
        <Spacer h={16} />
        {!codeSent ? (
          <Button onClick={sendConfirmationCode}>Send Confirmation Code</Button>
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
