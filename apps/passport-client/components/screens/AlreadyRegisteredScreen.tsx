import { PCDCrypto } from "@pcd/passport-crypto";
import {
  ConfirmEmailResult,
  requestConfirmationEmail,
  requestDownloadAndDecryptStorage,
  requestLogToServer
} from "@pcd/passport-interface";
import { sleep } from "@pcd/util";
import {
  FormEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useState
} from "react";
import { appConfig } from "../../src/appConfig";
import { useDispatch, useQuery, useSelf } from "../../src/appHooks";
import { err } from "../../src/util";
import {
  BackgroundGlow,
  BigInput,
  Button,
  CenterColumn,
  H2,
  HR,
  Spacer,
  TextCenter
} from "../core";
import { RippleLoader } from "../core/RippleLoader";
import { MaybeModal } from "../modals/Modal";
import { AppContainer } from "../shared/AppContainer";
import { PasswordInput } from "../shared/PasswordInput";

export function AlreadyRegisteredScreen() {
  const dispatch = useDispatch();
  const self = useSelf();
  const query = useQuery();
  const email = query?.get("email");
  const salt = query?.get("salt");
  const identityCommitment = query?.get("identityCommitment");
  const [isLoading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [revealPassword, setRevealPassword] = useState(false);

  const handleConfirmationEmailResult = useCallback(
    async (result: ConfirmEmailResult) => {
      if (!result.success) {
        err(dispatch, "Email failed", result.error);
        setLoading(false);
      } else if (result.value?.devToken != null) {
        await dispatch({
          type: "verify-token",
          email,
          token: result.value.devToken
        });
        setLoading(false);
      } else {
        window.location.href = `#/enter-confirmation-code?email=${encodeURIComponent(
          email
        )}&identityCommitment=${encodeURIComponent(identityCommitment)}`;
      }
    },
    [dispatch, email, identityCommitment]
  );

  const onOverwriteClick = useCallback(async () => {
    requestLogToServer(appConfig.zupassServer, "overwrite-account-click", {
      email,
      identityCommitment
    });

    setLoading(true);
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

      if (password == "" || password == null) {
        return dispatch({
          type: "error",
          error: {
            title: "Missing password",
            message: "Please enter a password",
            dismissToCurrentPage: true
          }
        });
      }

      setLoading(true);
      await sleep(10);
      const crypto = await PCDCrypto.newInstance();
      const encryptionKey = await crypto.argon2(password, salt, 32);
      const storageResult = await requestDownloadAndDecryptStorage(
        appConfig.zupassServer,
        encryptionKey
      );
      setLoading(false);

      if (!storageResult.success) {
        return dispatch({
          type: "error",
          error: {
            title: "Password incorrect",
            message:
              "Double-check your password. If you've lost access, please click 'Reset Account' below.",
            dismissToCurrentPage: true
          }
        });
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

  return (
    <>
      <MaybeModal />
      <AppContainer bg="primary">
        <BackgroundGlow
          y={224}
          from="var(--bg-lite-primary)"
          to="var(--bg-dark-primary)"
        >
          <Spacer h={64} />
          <TextCenter>
            <H2>Welcome Back</H2>
          </TextCenter>
          <Spacer h={24} />
          <TextCenter>
            Enter your password below to continue. If you've lost your password,
            you can reset your account. Resetting your account will let you
            access your tickets, but you'll lose all non-ticket PCDs.
          </TextCenter>
          <Spacer h={24} />
          {isLoading ? (
            <RippleLoader />
          ) : (
            <>
              <CenterColumn w={280}>
                <BigInput value={email} disabled={true} readOnly />
                <Spacer h={8} />
                {/*
                 * If a user has a `salt` field, then that means they chose their own password
                 * and we saved the randomly generated salt for them. This is default true for
                 * new PCDPass accounts, but false for Zupass accounts, where we give them a
                 * Sync Key instead.
                 */}
                {!salt && (
                  <Button onClick={onLoginWithMasterPasswordClick}>
                    Login with Sync Key
                  </Button>
                )}
                {salt && (
                  <form onSubmit={onSubmitPassword}>
                    <PasswordInput
                      autoFocus
                      value={password}
                      setValue={setPassword}
                      placeholder="Password"
                      revealPassword={revealPassword}
                      setRevealPassword={setRevealPassword}
                    />
                    <Spacer h={8} />
                    <Button type="submit">Login</Button>
                  </form>
                )}
                <Spacer h={8} />
                <Button onClick={onCancelClick}>Cancel</Button>
              </CenterColumn>
              <Spacer h={24} />
              <HR />
              <Spacer h={24} />
              <CenterColumn w={280}>
                <Button onClick={onOverwriteClick} style="danger">
                  Reset Account
                </Button>
              </CenterColumn>
            </>
          )}
        </BackgroundGlow>
        <Spacer h={64} />
      </AppContainer>
    </>
  );
}
