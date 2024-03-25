import { sleep } from "@pcd/util";
import { useCallback, useState } from "react";
import styled from "styled-components";
import {
  useDispatch,
  useSelf,
  useServerStorageRevision,
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
export function RequireAddPasswordModal(): JSX.Element {
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

  const onAddPassword = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    await sleep();
    try {
      const currentEncryptionKey = loadEncryptionKey();
      await setPassword(
        newPassword,
        currentEncryptionKey,
        serverStorageRevision,
        dispatch,
        update
      );

      dispatch({
        type: "set-modal",
        modal: { modalType: "none" }
      });
    } catch (e) {
      console.log("error setting password", e);
      if (e instanceof Error) {
        setError(e.message);
      }
    } finally {
      setLoading(false);
    }
  }, [loading, newPassword, serverStorageRevision, dispatch, update]);

  if (loading) {
    return <ScreenLoader text="Adding your password..." />;
  }

  return (
    <Container>
      <H2>Reinforce Your Account</H2>
      <Spacer h={24} />
      Before adding this PCD, you will need to upgrade to an
      end-to-end-encrypted Zupass. To upgrade, please choose a password. Make
      sure to remember it, otherwise you will lose access to all your PCDs.
      <Spacer h={24} />
      <BigInput value={self?.email} disabled={true} />
      <Spacer h={8} />
      <NewPasswordForm
        error={error}
        setError={setError}
        passwordInputPlaceholder="New password"
        email={self?.email}
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
