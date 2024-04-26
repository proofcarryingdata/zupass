import { requestVerifyToken } from "@pcd/passport-interface";
import { sleep, validateEmail } from "@pcd/util";
import { useCallback, useEffect, useState } from "react";
import { appConfig } from "../../../src/appConfig";
import { useDispatch, useQuery, useSelf } from "../../../src/appHooks";
import { hasPendingRequest } from "../../../src/sessionStorage";
import { BigInput, CenterColumn, H2, HR, Spacer, TextCenter } from "../../core";
import { Button } from "../../core/Button";
import { MaybeModal } from "../../modals/Modal";
import { AppContainer } from "../../shared/AppContainer";
import ExpandableText from "../../shared/ExpandableText";
import { NewPasswordForm } from "../../shared/NewPasswordForm";
import { ScreenLoader } from "../../shared/ScreenLoader";

export function CreatePasswordScreen(): JSX.Element | null {
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
  const [skipConfirm, setSkipConfirm] = useState(false);

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

  const onSkipPassword = useCallback(async () => {
    try {
      // If email or token are undefined, we will already have redirected to
      // login, so this is just for type-checking
      if (email && token) {
        setSettingPassword(true);
        await sleep();
        await dispatch({
          type: "create-user-skip-password",
          email,
          token
        });
      }
    } finally {
      setSettingPassword(false);
    }
  }, [dispatch, email, token]);

  useEffect(() => {
    checkIfShouldRedirect();
  }, [checkIfShouldRedirect]);

  useEffect(() => {
    // Redirect to home if already logged in
    if (self) {
      if (hasPendingRequest()) {
        window.location.hash = "#/login-interstitial";
      } else {
        window.location.hash = "#/";
      }
    }
  }, [self]);

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

  let content = null;

  // If either email or token are undefined, we will already have redirected
  if (!email || !token) {
    return null;
  }

  if (settingPassword) {
    content = <ScreenLoader text="Creating your account..." />;
  } else if (skipConfirm) {
    content = (
      <>
        <Spacer h={64} />
        <H2>Skipping Password Setup</H2>
        <Spacer h={24} />
        <TextCenter>
          <ExpandableText
            shortText="You can always set a password later."
            longText={
              <>
                You are creating a Zupass without setting a password. This means
                that your PCDs will be encrypted by a key stored on our server.
                You can always set a password later to reinforce your account
                with end-to-end-encryption.
              </>
            }
          />
        </TextCenter>
        <Spacer h={24} />
        <Button style="danger" onClick={onSkipPassword}>
          I understand
        </Button>
        <Spacer h={8} />
        <Button onClick={() => setSkipConfirm(false)}>Cancel</Button>
      </>
    );
  } else {
    content = (
      <>
        <Spacer h={64} />
        <TextCenter>
          <H2>Choose a Password</H2>
          <Spacer h={24} />
          <ExpandableText
            shortText={
              <>
                Your password will be used to generate an encryption key that
                secures your data.
              </>
            }
            longText={
              <>
                Your password will be used to generate an encryption key that
                secures your data. This key will never leave the browser, so
                save your password somewhere you'll be able to find later. If
                you lose your password, you will have to reset your account, and
                you'll lose access to your old Zupass Identity and all of your
                PCDs.
              </>
            }
          />
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
          <Spacer h={8} />
          <Button onClick={onCancelClick} style="secondary">
            Cancel
          </Button>
          <Spacer h={24} />
          <HR />
          <Spacer h={24} />

          <TextCenter>
            <Button style="danger" onClick={() => setSkipConfirm(true)}>
              Skip for now
            </Button>
          </TextCenter>
        </CenterColumn>
        {/* Add spacing to bottom for iOS keyboard */}
        <Spacer h={512} />
      </>
    );
  }

  return (
    <>
      <MaybeModal fullScreen />
      <AppContainer bg="primary">{content}</AppContainer>
    </>
  );
}
