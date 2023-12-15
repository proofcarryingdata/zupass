import { sleep } from "@pcd/util";
import { useCallback, useState } from "react";
import styled from "styled-components";
import {
  useDispatch,
  useEncryptionKey,
  useSelf,
  useServerStorageRevision,
  useUpdate
} from "../../src/appHooks";
import { setPassword } from "../../src/password";
import { useSyncE2EEStorage } from "../../src/useSyncE2EEStorage";
import { BigInput, H2, Spacer } from "../core";
import { NewPasswordForm } from "../shared/NewPasswordForm";
import { ScreenLoader } from "../shared/ScreenLoader";

/**
 * This uncloseable modal is shown to users of Zupass who have a sync key,
 * and have never created a password. It asks them to create a password.
 */
export function UpgradeAccountModal() {
  useSyncE2EEStorage();
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const update = useUpdate();
  const self = useSelf();
  const serverStorageRevision = useServerStorageRevision();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [revealPassword, setRevealPassword] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const encryptionKey = useEncryptionKey();

  const onAddPassword = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    await sleep();
    try {
      await setPassword(
        newPassword,
        encryptionKey,
        serverStorageRevision,
        dispatch,
        update
      );

      dispatch({
        type: "set-modal",
        modal: { modalType: "changed-password" }
      });
    } catch (e) {
      console.log("error setting password", e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [
    loading,
    newPassword,
    encryptionKey,
    serverStorageRevision,
    dispatch,
    update
  ]);

  if (loading) {
    return <ScreenLoader text="Adding your password..." />;
  }

  return (
    <Container>
      <H2>Upgrade Your Account</H2>
      <Spacer h={24} />
      Zupass now supports logging in with a password! To continue to use Zupass,
      you must choose a password. Make sure to remember it, otherwise you will
      lose access to all your PCDs.
      <Spacer h={24} />
      <BigInput value={self.email} disabled={true} />
      <Spacer h={8} />
      <NewPasswordForm
        error={error}
        setError={setError}
        passwordInputPlaceholder="New password"
        email={self.email}
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
