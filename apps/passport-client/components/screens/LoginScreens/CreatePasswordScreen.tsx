import { requestVerifyToken } from "@pcd/passport-interface";
import { sleep } from "@pcd/util";
import { useCallback, useEffect, useState } from "react";
import { appConfig } from "../../../src/appConfig";
import { useDispatch, useQuery, useSelf } from "../../../src/appHooks";
import { validateEmail } from "../../../src/util";
import { BigInput, CenterColumn, H2, HR, Spacer, TextCenter } from "../../core";
import { Button } from "../../core/Button";
import { AppContainer } from "../../shared/AppContainer";
import { NewPasswordForm } from "../../shared/NewPasswordForm";
import { ScreenLoader } from "../../shared/ScreenLoader";

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
      await sleep(10);
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

  const onCancelClick = useCallback(() => {
    window.location.href = "#/";
  }, []);

  let content = null;

  if (settingPassword) {
    content = <ScreenLoader text="Creating your account..." />;
  } else {
    content = (
      <>
        <Spacer h={64} />
        <TextCenter>
          <H2>Choose a Password</H2>
          <Spacer h={24} />
          Choose a secure, unique password. This password will be used to
          generate an encryption key that secures your data. Save your password
          somewhere you'll be able to find it later.
        </TextCenter>
        <Spacer h={24} />

        <CenterColumn>
          <BigInput value={email} disabled={true} />
          <Spacer h={8} />
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

          <Button onClick={onCancelClick} style="secondary">
            Cancel
          </Button>
        </CenterColumn>
      </>
    );
  }

  return (
    <AppContainer bg="primary">
      {content}
      <Spacer h={64} />
    </AppContainer>
  );
}
