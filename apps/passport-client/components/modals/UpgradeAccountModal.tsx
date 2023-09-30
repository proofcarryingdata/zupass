import { PCDCrypto } from "@pcd/passport-crypto";
import { requestPasswordSalt } from "@pcd/passport-interface";
import { useCallback, useState } from "react";
import styled from "styled-components";
import { appConfig } from "../../src/appConfig";
import { useDispatch, useSelf, useSyncKey } from "../../src/appHooks";
import { updateBlobKeyForEncryptedStorage } from "../../src/useSyncE2EEStorage";
import { BigInput, H2, Spacer } from "../core";
import { NewPasswordForm } from "../shared/NewPasswordForm";

/**
 * This uncloseable modal is shown to users of Zupass who have a sync key,
 * and have never created a password. It asks them to create a password.
 */
export function UpgradeAccountModal() {
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const self = useSelf();
  const encryptionKey = useSyncKey();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [revealPassword, setRevealPassword] = useState(false);
  const [error, setError] = useState<string | undefined>();

  // copied from `ChangePasswordScreen`.
  // @todo - factor this out. I don't forsee us needing to do this anytime soon.
  // @alternatively, delete this screen after Devconnect.
  const onChangePassword = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      const saltResult = await requestPasswordSalt(
        appConfig.zupassServer,
        self.email
      );

      if (!saltResult.success) {
        throw new Error("Error occurred while fetching salt from server");
      }

      const crypto = await PCDCrypto.newInstance();
      const currentEncryptionKey = encryptionKey;
      const { salt: newSalt, key: newEncryptionKey } =
        await crypto.generateSaltAndEncryptionKey(newPassword);
      const res = await updateBlobKeyForEncryptedStorage(
        currentEncryptionKey,
        newEncryptionKey,
        newSalt
      );

      if (!res.success) {
        throw new Error("couldn't set password");
      }

      dispatch({
        type: "set-modal",
        modal: "changed-password"
      });

      dispatch({
        type: "change-password",
        newEncryptionKey,
        newSalt
      });
    } catch (e) {
      setError("Couldn't set a password. Try again later.");
    } finally {
      setLoading(false);
    }
  }, [loading, self.email, encryptionKey, newPassword, dispatch]);

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
        onSuccess={onChangePassword}
      />
    </Container>
  );
}

const Container = styled.div`
  padding: 32px;
`;
