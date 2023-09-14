import { PCDCrypto } from "@pcd/passport-crypto";
import {
  FormEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useState
} from "react";
import { downloadAndDecryptStorage } from "../../src/api/endToEndEncryptionApi";
import { logToServer } from "../../src/api/logApi";
import { requestLoginCode } from "../../src/api/user";
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

export function AlreadyRegisteredScreen() {
  const dispatch = useDispatch();
  const self = useSelf();
  const [isLoading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const query = useQuery();
  const email = query?.get("email");
  const salt = query?.get("salt");
  const identityCommitment = query?.get("identityCommitment");

  const onEmailSuccess = useCallback(
    (devToken: string | undefined) => {
      if (devToken === undefined) {
        window.location.href = `#/enter-confirmation-code?email=${encodeURIComponent(
          email
        )}&identityCommitment=${encodeURIComponent(identityCommitment)}`;
      } else {
        dispatch({ type: "verify-token", email, token: devToken });
      }
    },
    [dispatch, email, identityCommitment]
  );

  const onOverwriteClick = useCallback(() => {
    setLoading(true);
    logToServer("overwrite-account-click", { email, identityCommitment });
    requestLoginCode(email, identityCommitment, true)
      .then(onEmailSuccess)
      .catch((e) => {
        err(dispatch, "Email failed", e.message);
        setLoading(false);
      });
  }, [dispatch, email, identityCommitment, onEmailSuccess]);

  const onLoginWithMasterPasswordClick = useCallback(() => {
    logToServer("login-with-master-password-click", {
      email,
      identityCommitment
    });
    window.location.href = "#/sync-existing";
  }, [email, identityCommitment]);

  const onSubmitPassword = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!password) {
        dispatch({
          type: "error",
          error: {
            title: "Missing password",
            message: "Please enter a password",
            dismissToCurrentPage: true
          }
        });
        return;
      }

      try {
        setLoading(true);

        const crypto = await PCDCrypto.newInstance();
        const syncKey = await crypto.argon2(password, salt, 32);
        const storage = await downloadAndDecryptStorage(syncKey);
        dispatch({
          type: "load-from-sync",
          storage,
          encryptionKey: syncKey
        });
        setLoading(false);
      } catch (e) {
        dispatch({
          type: "error",
          error: {
            title: "Password incorrect",
            message:
              "Double-check your password. If you've lost access, please click 'Reset Account' below.",
            dismissToCurrentPage: true
          }
        });
        setLoading(false);
      }
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
            <H2>LOGIN</H2>
          </TextCenter>
          <Spacer h={32} />
          <TextCenter>
            Welcome back! Enter your password below to continue. If you've lost
            your password, you can reset your account. Resetting your account
            will let you access your tickets, but you'll lose all non-ticket
            PCDs.
          </TextCenter>
          <Spacer h={32} />
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
                    <BigInput
                      placeholder="Password"
                      autoFocus
                      value={password}
                      type="password"
                      onChange={(e) => setPassword(e.target.value)}
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
