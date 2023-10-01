import { PCDCrypto } from "@pcd/passport-crypto";
import {
  ConfirmEmailResult,
  requestConfirmationEmail,
  requestDownloadAndDecryptStorage,
  requestLogToServer,
  requestVerifyToken
} from "@pcd/passport-interface";
import { sleep } from "@pcd/util";
import {
  FormEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useState
} from "react";
import { appConfig } from "../../../src/appConfig";
import { useDispatch, useQuery, useSelf } from "../../../src/appHooks";
import {
  BigInput,
  Button,
  CenterColumn,
  H2,
  HR,
  Spacer,
  TextCenter
} from "../../core";
import { ErrorMessage } from "../../core/error";
import { MaybeModal } from "../../modals/Modal";
import { AppContainer } from "../../shared/AppContainer";
import { PasswordInput } from "../../shared/PasswordInput";
import { ScreenLoader } from "../../shared/ScreenLoader";

export function AlreadyRegisteredScreen() {
  const dispatch = useDispatch();
  const self = useSelf();
  const query = useQuery();
  const email = query?.get("email");
  const salt = query?.get("salt");
  const identityCommitment = query?.get("identityCommitment");
  const [error, setError] = useState<string | undefined>();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [sendingConfirmationEmail, setSendingConfirmationEmail] =
    useState(false);
  const [password, setPassword] = useState("");
  const [revealPassword, setRevealPassword] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);

  const verifyToken = useCallback(
    async (token: string) => {
      if (verifyingCode) return;

      setVerifyingCode(true);
      const verifyTokenResult = await requestVerifyToken(
        appConfig.zupassServer,
        email,
        token
      );
      setVerifyingCode(false);
      if (verifyTokenResult.success) {
        window.location.hash = `#/create-password?email=${encodeURIComponent(
          email
        )}&token=${encodeURIComponent(token)}`;
        return;
      } else {
        setError("Invalid confirmation code");
      }
    },
    [email, verifyingCode]
  );

  const handleConfirmationEmailResult = useCallback(
    async (result: ConfirmEmailResult) => {
      if (!result.success) {
        setError("Couldn't send pasword reset email. Try again later.");
        setSendingConfirmationEmail(false);
      } else if (result.value?.devToken != null) {
        setSendingConfirmationEmail(false);
        verifyToken(result.value?.devToken);
      } else {
        window.location.href = `#/enter-confirmation-code?email=${encodeURIComponent(
          email
        )}&identityCommitment=${encodeURIComponent(identityCommitment)}`;
      }
    },
    [email, identityCommitment, verifyToken]
  );

  const onOverwriteClick = useCallback(async () => {
    requestLogToServer(appConfig.zupassServer, "overwrite-account-click", {
      email,
      identityCommitment
    });

    setSendingConfirmationEmail(true);
    const emailConfirmationResult = await requestConfirmationEmail(
      appConfig.zupassServer,
      email,
      identityCommitment,
      true
    );
    handleConfirmationEmailResult(emailConfirmationResult);
  }, [email, identityCommitment, handleConfirmationEmailResult]);

  const onLoginWithMasterPasswordClick = useCallback(() => {
    requestLogToServer(
      appConfig.zupassServer,
      "login-with-master-password-click",
      {
        email,
        identityCommitment
      }
    );
    window.location.href = "#/sync-existing";
  }, [email, identityCommitment]);

  const onSubmitPassword = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setError(undefined);

      if (password == "" || password == null) {
        return setError("Enter a password");
      }

      setIsLoggingIn(true);
      await sleep();
      const crypto = await PCDCrypto.newInstance();
      const encryptionKey = await crypto.argon2(password, salt, 32);
      const storageResult = await requestDownloadAndDecryptStorage(
        appConfig.zupassServer,
        encryptionKey
      );
      setIsLoggingIn(false);

      if (!storageResult.success) {
        return setError(
          "Password incorrect. Double-check your password. " +
            "If you've lost access, you can reset your account below."
        );
      }

      dispatch({
        type: "load-from-sync",
        storage: storageResult.value,
        encryptionKey: encryptionKey
      });
    },
    [dispatch, password, salt]
  );

  const onCancelClick = useCallback(() => {
    window.location.href = "#/";
  }, []);

  useEffect(() => {
    if (self || !email) {
      window.location.href = "#/";
    }
  }, [self, email]);

  // scroll to top when we navigate to this page
  useLayoutEffect(() => {
    document.body.scrollTop = document.documentElement.scrollTop = 0;
  }, []);

  if (self || !email) {
    return null;
  }

  let content = null;
  if (sendingConfirmationEmail) {
    content = (
      <ScreenLoader text="Sending you an email with a reset token..." />
    );
  } else if (isLoggingIn) {
    content = <ScreenLoader text="Logging you in..." />;
  } else {
    content = (
      <>
        <Spacer h={64} />
        <TextCenter>
          <H2>Login</H2>
          <Spacer h={24} />
          You already have an account. Log in with your password.
        </TextCenter>
        <Spacer h={24} />

        <CenterColumn>
          <BigInput value={email} disabled={true} readOnly />

          <Spacer h={8} />

          {/*
           * If a user has a `salt` field, then that means they chose their own password
           * and we saved the randomly generated salt for them. This is default true for
           * new PCDPass accounts, but false for Zupass accounts, where we give them a
           * Sync Key instead.
           */}

          {salt ? (
            <form onSubmit={onSubmitPassword}>
              <PasswordInput
                autoFocus
                value={password}
                setValue={setPassword}
                placeholder="Password"
                revealPassword={revealPassword}
                setRevealPassword={setRevealPassword}
              />
              {error && (
                <>
                  <Spacer h={16} />
                  <ErrorMessage>{error}</ErrorMessage>
                  <Spacer h={8} />
                </>
              )}
              <Spacer h={8} />
              <Button type="submit">Login</Button>
            </form>
          ) : (
            <Button onClick={onLoginWithMasterPasswordClick}>
              Login with Sync Key
            </Button>
          )}

          <Spacer h={24} />
          <HR />
          <Spacer h={24} />

          <Button onClick={onCancelClick} style="secondary">
            Cancel
          </Button>
          <Spacer h={8} />
          <Button onClick={onOverwriteClick} style="danger">
            Forgot Password
          </Button>
        </CenterColumn>
      </>
    );
  }

  return (
    <>
      <MaybeModal />
      <AppContainer bg="primary">
        {content}
        <Spacer h={64} />
      </AppContainer>
    </>
  );
}
