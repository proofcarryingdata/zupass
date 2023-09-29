import { requestVerifyToken } from "@pcd/passport-interface";
import { useCallback, useEffect, useState } from "react";
import { appConfig } from "../../src/appConfig";
import { useDispatch, useQuery, useSelf } from "../../src/appHooks";
import { validateEmail } from "../../src/util";
import {
  BackgroundGlow,
  CenterColumn,
  H2,
  HR,
  Spacer,
  TextCenter
} from "../core";
import { LinkButton } from "../core/Button";
import { RippleLoader } from "../core/RippleLoader";
import { AppContainer } from "../shared/AppContainer";
import { NewPasswordForm } from "../shared/NewPasswordForm";

export function CreatePasswordScreen() {
  const dispatch = useDispatch();
  const self = useSelf();
  const query = useQuery();
  const email = query?.get("email");
  const token = query?.get("token");
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

  const checkIfShouldRedirect = useCallback(async () => {
    if (!email || !validateEmail(email) || !token) {
      return redirectToLoginPageWithError(
        "Invalid email or token, redirecting to login"
      );
    }

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
  }, [email, redirectToLoginPageWithError, token]);

  useEffect(() => {
    checkIfShouldRedirect();
  }, [checkIfShouldRedirect]);

  useEffect(() => {
    // Redirect to home if already logged in
    if (self != null) {
      window.location.hash = "#/";
    }
  }, [self]);

  const onSetPassword = useCallback(async () => {
    try {
      setSettingPassword(true);
      await dispatch({
        type: "login",
        email,
        token,
        password
      });
    } finally {
      setSettingPassword(false);
    }
  }, [dispatch, email, password, token]);

  return (
    <AppContainer bg="primary">
      <BackgroundGlow
        y={224}
        from="var(--bg-lite-primary)"
        to="var(--bg-dark-primary)"
      >
        <CenterColumn w={280}>
          <Spacer h={64} />

          <TextCenter>
            <H2>Set Password</H2>
            <Spacer h={24} />
            Choose a secure, unique password. This password will be used to
            generate your key to encrypt your data. Save your password somewhere
            secure.
          </TextCenter>

          <Spacer h={24} />

          {settingPassword ? (
            <>
              <RippleLoader />
            </>
          ) : (
            <>
              <NewPasswordForm
                error={error}
                setError={setError}
                autoFocus
                email={email}
                password={password}
                confirmPassword={confirmPassword}
                setPassword={setPassword}
                setConfirmPassword={setConfirmPassword}
                revealPassword={revealPassword}
                setRevealPassword={setRevealPassword}
                submitButtonText="Continue"
                onSuccess={onSetPassword}
              />
              <Spacer h={24} />
              <HR />
              <Spacer h={24} />
              <LinkButton to={"/"}>Cancel</LinkButton>
            </>
          )}
        </CenterColumn>
      </BackgroundGlow>
      <Spacer h={64} />
    </AppContainer>
  );
}
