import { PCDCrypto } from "@pcd/passport-crypto";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { attemptDownloadStorage } from "../../src/api/endToEndEncryptionApi";
import { fetchSaltFromServer } from "../../src/api/user";
import { useDispatch, useSelf } from "../../src/appHooks";
import { saveEncryptionKey } from "../../src/localstorage";
import { uploadStorage } from "../../src/useSyncE2EEStorage";
import { CenterColumn, H2, Spacer, TextCenter } from "../core";
import { LinkButton } from "../core/Button";
import { AppContainer } from "../shared/AppContainer";
import { NewPasswordForm, PasswordInput } from "../shared/NewPasswordForm";

export function ChangePasswordScreen() {
  const self = useSelf();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const dispatch = useDispatch();

  useEffect(() => {
    if (self == null) {
      console.log("Not logged in, redirecting to login screen");
      navigate("/login", { replace: true });
    }
  }, [self, navigate]);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [revealPassword, setRevealPassword] = useState(false);

  const onChangePassword = async () => {
    if (loading) return;
    setLoading(true);
    const res = await fetchSaltFromServer(self.email);
    const { salt } = await res.json();

    const crypto = await PCDCrypto.newInstance();
    try {
      const currentEncryptionKey = await crypto.argon2(
        currentPassword,
        salt,
        32
      );
      // FIXME: We actually need to delete these routes
      await attemptDownloadStorage(currentEncryptionKey);
    } catch (e) {
      setLoading(false);
      dispatch({
        type: "error",
        error: {
          title: "Password incorrect",
          message: "Please check your password and try again",
          dismissToCurrentPage: true
        }
      });
      return;
    }
    const newEncryptionKey = await crypto.argon2(newPassword, salt, 32);
    await saveEncryptionKey(newEncryptionKey);
    await uploadStorage();
    window.location.hash = "/#";
    // update({
    //   encryptionKey
    // });
  };

  return (
    <AppContainer bg="gray">
      <Spacer h={64} />
      <Header />
      <Spacer h={24} />

      <CenterColumn w={280}>
        <PasswordInput
          placeholder="Current password"
          autoFocus
          revealPassword={revealPassword}
          setRevealPassword={setRevealPassword}
          value={currentPassword}
          setValue={setCurrentPassword}
        />
        <Spacer h={8} />
        <NewPasswordForm
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
      </CenterColumn>
      <Spacer h={8} />
      <CenterColumn w={280}>
        <LinkButton to={"/"}>Cancel</LinkButton>
      </CenterColumn>
      <Spacer h={64} />
    </AppContainer>
  );
}

function Header() {
  return (
    <TextCenter>
      <H2>Change Password</H2>
      <Spacer h={24} />
      <Description>
        Make sure that your new password is secure, unique, and memorable.
      </Description>
    </TextCenter>
  );
}

const Description = styled.p`
  font-weight: 300;
  width: 220px;
  margin: 0 auto;
`;
