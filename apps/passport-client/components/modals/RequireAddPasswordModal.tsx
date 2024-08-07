import { CredentialManager } from "@pcd/passport-interface";
import { getErrorMessage, sleep } from "@pcd/util";
import React, { ReactNode, useCallback, useState } from "react";
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
import { CenterColumn, H2, Spacer, TextCenter } from "../core";
import { NewPasswordForm } from "../shared/NewPasswordForm";
import { ScreenLoader } from "../shared/ScreenLoader";

/**
 * This uncloseable modal is shown to users of Zupass who have a sync key,
 * and have never created a password. It asks them to create a password.
 */
export function RequireAddPasswordModal(): ReactNode {
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
        (
          await credentialManager.requestCredentials({
            signatureType: "sempahore-signature-pcd"
          })
        )[0]
      );

      dispatch({
        type: "set-modal",
        modal: { modalType: "none" }
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

  if (!self) {
    return null;
  }

  if (loading) {
    return <ScreenLoader text="Adding your password..." />;
  }

  return (
    <Container>
      <CenterColumn>
        <H2>Reinforce Your Account</H2>
        <Spacer h={24} />
        <TextCenter>
          Before adding this PCD, you will need to upgrade to an
          end-to-end-encrypted Zupass. To upgrade, please choose a password.
          Make sure to remember it, otherwise you will lose access to all your
          PCDs.
        </TextCenter>

        <Spacer h={24} />
        <div>
          {self.emails.map((e, i) => (
            <React.Fragment key={i}>
              {e}
              <br />
            </React.Fragment>
          ))}
        </div>
        <Spacer h={8} />

        <NewPasswordForm
          error={error}
          setError={setError}
          passwordInputPlaceholder="New password"
          emails={self.emails}
          revealPassword={revealPassword}
          setRevealPassword={setRevealPassword}
          submitButtonText="Confirm"
          password={newPassword}
          confirmPassword={confirmPassword}
          setPassword={setNewPassword}
          setConfirmPassword={setConfirmPassword}
          onSuccess={onAddPassword}
        />
      </CenterColumn>
    </Container>
  );
}

const Container = styled.div`
  padding: 32px;
`;
