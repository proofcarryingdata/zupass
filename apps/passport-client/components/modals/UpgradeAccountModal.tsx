import { CredentialManager } from "@pcd/passport-interface";
import { getErrorMessage, sleep } from "@pcd/util";
import { useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import {
  useDispatch,
  useSelf,
  useServerStorageRevision,
  useStateContext,
  useUpdate
} from "../../src/appHooks";
import { loadEncryptionKey } from "../../src/localstorage";
import { setPassword } from "../../src/password";
import { useSyncE2EEStorage } from "../../src/useSyncE2EEStorage";
import { BigInput, H2, Spacer } from "../core";
import { NewPasswordForm } from "../shared/NewPasswordForm";
import { ScreenLoader } from "../shared/ScreenLoader";

/**
 * This uncloseable modal is shown to users of Zupass who have a sync key,
 * and have never created a password. It asks them to create a password.
 */
export function UpgradeAccountModal(): JSX.Element | null {
  useSyncE2EEStorage();
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const update = useUpdate();
  const self = useSelf();
  const serverStorageRevision = useServerStorageRevision();
  const stateContext = useStateContext();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [revealPassword, setRevealPassword] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const onAddPassword = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    await sleep();
    try {
      const currentEncryptionKey = loadEncryptionKey();
      if (!currentEncryptionKey) {
        throw new Error("Could not load encryption key");
      }

      const { pcds, identity, credentialCache } = stateContext.getState();
      const credentialManager = new CredentialManager(
        identity,
        pcds,
        credentialCache
      );
      await setPassword(
        newPassword,
        currentEncryptionKey,
        serverStorageRevision,
        dispatch,
        update,
        await credentialManager.requestCredentials({
          signatureType: "sempahore-signature-pcd"
        })
      );

      dispatch({
        type: "set-modal",
        modal: { modalType: "changed-password" }
      });
    } catch (e) {
      console.log("error setting password", e);
      alert(
        `Error setting password
        
        ${getErrorMessage(e)}`
      );
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [
    loading,
    stateContext,
    newPassword,
    serverStorageRevision,
    dispatch,
    update
  ]);

  useEffect(() => {
    if (!self) {
      dispatch({ type: "set-modal", modal: { modalType: "none" } });
    }
  }, [dispatch, self]);

  if (loading) {
    return <ScreenLoader text="Adding your password..." />;
  }

  if (!self) {
    return null;
  }

  return (
    <Container>
      <H2>Upgrade Your Account</H2>
      <Spacer h={24} />
      Zupass now supports logging in with a password! To continue to use Zupass,
      you must choose a password. Make sure to remember it, otherwise you will
      lose access to all your PCDs.
      <Spacer h={24} />
      <BigInput value={self.emails?.[0]} disabled={true} />
      <Spacer h={8} />
      <NewPasswordForm
        error={error}
        setError={setError}
        passwordInputPlaceholder="New password"
        email={self.emails?.[0]}
        revealPassword={revealPassword}
        setRevealPassword={setRevealPassword}
        submitButtonText="Confirm"
        password={newPassword}
        confirmPassword={confirmPassword}
        setPassword={setNewPassword}
        setConfirmPassword={setConfirmPassword}
        onSuccess={onAddPassword}
      />
    </Container>
  );
}

const Container = styled.div`
  padding: 32px;
`;
