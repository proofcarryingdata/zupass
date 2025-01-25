import { HexString, PCDCrypto } from "@pcd/passport-crypto";
import {
  CredentialManager,
  requestPasswordSalt
} from "@pcd/passport-interface";
import { getErrorMessage } from "@pcd/util";
import React, { Suspense, useCallback, useEffect, useState } from "react";
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
import { NewLoader } from "../NewLoader";
import { Typography } from "../Typography";

const NewPasswordForm2 = React.lazy(() =>
  import("../../shared/Login/NewPasswordForm2").then((module) => {
    return {
      default: module.NewPasswordForm2
    };
  })
);

export const ChangePasswordModal = (): JSX.Element | null => {
  useSyncE2EEStorage();
  const self = useSelf();
  const activeBottomModal = useBottomModal();
  const hasSetupPassword = useHasSetupPassword();
  const serverStorageRevision = useServerStorageRevision();
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

  const isOpen = activeBottomModal.modalType === "change-password";
  useEffect(() => {
    return () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setError(undefined);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!self) {
      navigate("/login", { replace: true });
    }
  }, [self, navigate]);

  const onChangePassword = useCallback(async () => {
    if (loading || !self) return;
    setLoading(true);
    try {
      let currentEncryptionKey: HexString;
      if (!hasSetupPassword) {
        currentEncryptionKey = (await loadEncryptionKey()) as string;
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
          title: hasSetupPassword ? "PASSWORD CHANGED" : "PASSWORD ADDED",
          description: `You have successfully ${
            hasSetupPassword ? "changed" : "added"
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
    hasSetupPassword,
    stateContext,
    newPassword,
    serverStorageRevision,
    dispatch,
    update,
    currentPassword
  ]);

  const onCancel = useCallback(() => {
    dispatch({
      type: "set-bottom-modal",
      modal: {
        modalType: "settings"
      }
    });
  }, [dispatch]);

  if (!self) return null;

  return (
    <BottomModal isOpen={isOpen}>
      <Container>
        <TitleContainer>
          <Typography fontSize={20} fontWeight={800}>
            {hasSetupPassword ? "CHANGE" : "ADD"} PASSWORD
          </Typography>
          <Typography fontSize={16} fontWeight={400} family="Rubik">
            Make sure that your {hasSetupPassword ? "new" : ""} password is
            secure, unique, and memorable. If you forget your password, you'll
            have to reset your account, and you will lose access to all your
            PODs.
          </Typography>
        </TitleContainer>
        <Suspense
          fallback={
            <PasswordLoaderContainer>
              <NewLoader />
            </PasswordLoaderContainer>
          }
        >
          <NewPasswordForm2
            setRevealPassword={setRevealPassword}
            revealPassword={revealPassword}
            loading={loading}
            autoFocus={!hasSetupPassword}
            error={error}
            setError={setError}
            passwordInputPlaceholder={
              hasSetupPassword ? "New password" : "Password"
            }
            emails={self.emails}
            submitButtonText="Confirm"
            password={newPassword}
            confirmPassword={confirmPassword}
            setPassword={setNewPassword}
            setConfirmPassword={setConfirmPassword}
            onSuccess={onChangePassword}
            onCancel={onCancel}
            isChangePassword={hasSetupPassword}
            currentPassword={currentPassword}
            setCurrentPassword={setCurrentPassword}
          />
        </Suspense>
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

const PasswordLoaderContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 250px;
  width: 100%;
`;
