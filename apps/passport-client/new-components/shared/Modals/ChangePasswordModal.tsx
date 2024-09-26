import { HexString, PCDCrypto } from "@pcd/passport-crypto";
import {
  CredentialManager,
  requestPasswordSalt
} from "@pcd/passport-interface";
import { getErrorMessage } from "@pcd/util";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { appConfig } from "../../../src/appConfig";
import {
  useBottomModal,
  useDispatch,
  useHasSetupPassword,
  useSelf,
  useServerStorageRevision,
  useStateContext,
  useUpdate
} from "../../../src/appHooks";
import { loadEncryptionKey } from "../../../src/localstorage";
import { setPassword } from "../../../src/password";
import { useSyncE2EEStorage } from "../../../src/useSyncE2EEStorage";
import { BottomModal } from "../BottomModal";
import { NewPasswordForm2 } from "../Login/NewPasswordForm2";
import { Typography } from "../Typography";

export const ChangePasswordModal = (): JSX.Element | null => {
  useSyncE2EEStorage();
  const self = useSelf();
  const activeBottomModal = useBottomModal();
  const hasSetupPassword = useHasSetupPassword();
  const serverStorageRevision = useServerStorageRevision();

  // We want the `isChangePassword` state to persist on future renders,
  // otherwise we may show the invalid copy on the "finished" screen
  // after a password is set for the first time.
  const [isChangePassword] = useState(hasSetupPassword);
  const stateContext = useStateContext();
  const dispatch = useDispatch();
  const update = useUpdate();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [revealPassword, setRevealPassword] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!self) {
      navigate("/new/login", { replace: true });
    }
  }, [self, navigate]);

  const onChangePassword = useCallback(async () => {
    if (loading || !self) return;
    setLoading(true);
    try {
      let currentEncryptionKey: HexString;
      if (!isChangePassword) {
        currentEncryptionKey = loadEncryptionKey() as string;
      } else {
        const saltResult = await requestPasswordSalt(
          appConfig.zupassServer,
          // any email associated with this account will return the right salt
          // so we just use the first one
          self.emails[0]
        );

        if (!saltResult.success) {
          throw new Error("Error occurred while fetching salt from server");
        }

        const crypto = await PCDCrypto.newInstance();
        currentEncryptionKey = crypto.argon2(
          currentPassword,
          saltResult.value as string
        );
      }

      const { pcds, identityV3, credentialCache } = stateContext.getState();
      const credentialManager = new CredentialManager(
        identityV3,
        pcds,
        credentialCache
      );

      await setPassword(
        newPassword,
        currentEncryptionKey,
        serverStorageRevision,
        dispatch,
        update,
        await credentialManager.requestCredential({
          signatureType: "sempahore-signature-pcd"
        })
      );
      setLoading(false);

      dispatch({
        type: "set-bottom-modal",
        modal: {
          modalType: "success-modal",
          title: isChangePassword ? "PASSWORD CHANGED" : "PASSWORD ADDED",
          description: `You have successfully ${
            isChangePassword ? "changed" : "added"
          } your password.`
        }
      });
    } catch (e) {
      console.log("error changing password", e);
      setLoading(false);
      setError(getErrorMessage(e));
    }
  }, [
    loading,
    self,
    isChangePassword,
    stateContext,
    newPassword,
    serverStorageRevision,
    dispatch,
    update,
    currentPassword
  ]);

  if (!self) return null;

  return (
    <BottomModal isOpen={activeBottomModal.modalType === "change-password"}>
      <Container>
        <TitleContainer>
          <Typography fontSize={20} fontWeight={800}>
            {isChangePassword ? "Change" : "Add"} Password
          </Typography>
          <Typography fontSize={16} fontWeight={400} family="Rubik">
            Make sure that your {isChangePassword ? "new" : ""} password is
            secure, unique, and memorable. If you forget your password, you'll
            have to reset your account, and you will lose access to all your
            PODs.
          </Typography>
        </TitleContainer>
        <NewPasswordForm2
          loading={loading}
          autoFocus={!isChangePassword}
          error={error}
          setError={setError}
          passwordInputPlaceholder={
            isChangePassword ? "New password" : "Password"
          }
          emails={self.emails}
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
    </BottomModal>
  );
};

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;
const TitleContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
`;
