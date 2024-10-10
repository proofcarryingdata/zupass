import { requestVerifyToken } from "@pcd/passport-interface";
import { sleep, validateEmail } from "@pcd/util";
import { useCallback, useEffect, useState } from "react";
import { AppContainer } from "../../../components/shared/AppContainer";
import { appConfig } from "../../../src/appConfig";
import { useDispatch, useQuery, useSelf } from "../../../src/appHooks";
import { hasPendingRequest } from "../../../src/sessionStorage";
import {
  LoginContainer,
  LoginTitleContainer
} from "../../shared/Login/LoginComponents";
import { NewPasswordForm2 } from "../../shared/Login/NewPasswordForm2";
import { Typography } from "../../shared/Typography";

export const NewCreatePasswordScreen = (): JSX.Element | null => {
  const dispatch = useDispatch();
  const self = useSelf();
  const query = useQuery();
  const email = query?.get("email");
  const token = query?.get("token");
  const autoRegister = query?.get("autoRegister") === "true";
  const targetFolder = query?.get("targetFolder");
  const [error, setError] = useState<string | undefined>();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [revealPassword, setRevealPassword] = useState(false);
  const [settingPassword, setSettingPassword] = useState(false);

  const redirectToLoginPageWithError = useCallback((e: Error | string) => {
    console.error(e);
    window.location.hash = "#/login";
    window.location.reload();
  }, []);

  const onSkipPassword = useCallback(async () => {
    try {
      if (
        !confirm(
          "Are you sure you want to skip setting a password? You can always set password later."
        )
      )
        return;
      // If email or token are undefined, we will already have redirected to
      // login, so this is just for type-checking
      if (email && token) {
        setSettingPassword(true);
        await sleep();
        await dispatch({
          type: "create-user-skip-password",
          email,
          token,
          targetFolder,
          autoRegister
        });
      }
    } finally {
      setSettingPassword(false);
      if (autoRegister) {
        window.location.href = "#/";
      }
    }
  }, [dispatch, email, token, targetFolder, autoRegister]);

  const checkIfShouldRedirect = useCallback(async () => {
    // Redirect to home if already logged in
    if (self) {
      // Present alert if we had tried to auto-register with a different
      // email than the currently logged-in email.
      if (autoRegister && !self.emails.includes(email as string)) {
        alert(
          `You are already logged in as ${
            self.emails.length === 1
              ? self.emails?.[0]
              : "an account that owns the following email addresses: " +
                self.emails.join(", ")
          }. Please log out and try navigating to the link again.`
        );
      }

      if (hasPendingRequest()) {
        window.location.hash = "#/login-interstitial";
      } else {
        window.location.hash = "#/";
      }
      return;
    }
    if (!email || !validateEmail(email) || !token) {
      return redirectToLoginPageWithError(
        "Invalid email or token, redirecting to login"
      );
    }

    if (autoRegister) {
      await onSkipPassword();
    } else {
      const verifyTokenResult = await requestVerifyToken(
        appConfig.zupassServer,
        email,
        token
      );

      if (!verifyTokenResult.success) {
        return redirectToLoginPageWithError(
          "Invalid email or token, redirecting to login"
        );
      }
    }
  }, [
    self,
    email,
    redirectToLoginPageWithError,
    token,
    autoRegister,
    onSkipPassword
  ]);

  useEffect(() => {
    checkIfShouldRedirect();
  }, [checkIfShouldRedirect]);

  const onSetPassword = useCallback(async () => {
    try {
      // If email or token are undefined, we will already have redirected to
      // login, so this is just for type-checking
      if (email && token) {
        setSettingPassword(true);
        await sleep();
        await dispatch({
          type: "login",
          email,
          token,
          password
        });
      }
    } finally {
      setSettingPassword(false);
    }
  }, [dispatch, email, password, token]);

  const onCancelClick = useCallback(() => {
    window.location.href = "#/";
  }, []);

  // If either email or token are undefined, we will already have redirected
  if (!email || !token) {
    return null;
  }

  return (
    <AppContainer bg="gray" fullscreen>
      <LoginContainer>
        <LoginTitleContainer>
          <Typography fontSize={24} fontWeight={800} color="#1E2C50">
            ADD PASSWORD
          </Typography>
          <Typography
            fontSize={16}
            fontWeight={400}
            color="#1E2C50"
            family="Rubik"
          >
            Make sure that your password is secure, unique, and memorable. If
            you forget your password, you'll have to reset your account, and you
            will lose access to all your PCDs.
          </Typography>
        </LoginTitleContainer>
        <NewPasswordForm2
          loading={settingPassword}
          autoFocus
          error={error}
          setError={setError}
          emails={[email]}
          revealPassword={revealPassword}
          setRevealPassword={setRevealPassword}
          submitButtonText={settingPassword ? "Confirming..." : "Confirm"}
          password={password}
          confirmPassword={confirmPassword}
          setPassword={setPassword}
          setConfirmPassword={setConfirmPassword}
          onSuccess={onSetPassword}
          onCancel={onCancelClick}
          showSkipConfirm
          onSkipConfirm={onSkipPassword}
          style={{ width: "100%", marginBottom: 24 }}
        />
      </LoginContainer>
    </AppContainer>
  );
};
