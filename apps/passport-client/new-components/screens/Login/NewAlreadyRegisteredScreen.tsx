import { PCDCrypto } from "@pcd/passport-crypto";
import {
  ConfirmEmailResult,
  requestConfirmationEmail,
  requestDownloadAndDecryptStorage,
  requestLogToServer,
  requestVerifyToken
} from "@pcd/passport-interface";
import { getErrorMessage, sleep } from "@pcd/util";
import {
  FormEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useState
} from "react";
import styled from "styled-components";
import { AppContainer } from "../../../components/shared/AppContainer";
import { appConfig } from "../../../src/appConfig";
import { useDispatch, useQuery, useSelf } from "../../../src/appHooks";
import { hasPendingRequest } from "../../../src/sessionStorage";
import { Button2 } from "../../shared/Button";
import { Input2 } from "../../shared/Input";
import {
  LoginContainer,
  LoginForm,
  LoginTitleContainer
} from "../../shared/Login/LoginComponents";
import { PasswordInput2 } from "../../shared/Login/PasswordInput2";
import { Typography } from "../../shared/Typography";

export const NewAlreadyRegisteredScreen: React.FC = () => {
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
  const [verifyingCode, setVerifyingCode] = useState(false);

  const verifyToken = useCallback(
    async (token: string) => {
      if (verifyingCode) return;

      if (email) {
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
        }
      }

      // If we did not succeed in verifying the token, show an error.
      setError("Invalid confirmation code");
    },
    [email, verifyingCode]
  );

  const handleConfirmationEmailResult = useCallback(
    (result: ConfirmEmailResult) => {
      if (!result.success) {
        setError("Couldn't send pasword reset email. Try again later.");
        setSendingConfirmationEmail(false);
      } else if (result.value?.devToken) {
        setSendingConfirmationEmail(false);
        verifyToken(result.value?.devToken);
      } else {
        if (email && identityCommitment) {
          window.location.href = `#/enter-confirmation-code?email=${encodeURIComponent(
            email
          )}&identityCommitment=${encodeURIComponent(
            identityCommitment
          )}&isReset=true`;
        }
      }
    },
    [email, identityCommitment, verifyToken]
  );

  const onOverwriteClick = useCallback(async () => {
    if (!email || !identityCommitment) {
      return;
    }
    requestLogToServer(appConfig.zupassServer, "overwrite-account-click", {
      email,
      identityCommitment
    });

    setSendingConfirmationEmail(true);
    const emailConfirmationResult = await requestConfirmationEmail(
      appConfig.zupassServer,
      email,
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
      if (!salt) return;
      setError(undefined);

      if (password === "" || password === null) {
        return setError("Enter a password");
      }

      setIsLoggingIn(true);
      await sleep();
      const crypto = await PCDCrypto.newInstance();
      const encryptionKey = crypto.argon2(password, salt, 32);
      const storageResult = await requestDownloadAndDecryptStorage(
        appConfig.zupassServer,
        encryptionKey
      );

      if (!storageResult.success) {
        setIsLoggingIn(false);
        if ("NotFound" === storageResult.error.name) {
          return setError("Password incorrect. Please try again.");
        } else {
          return setError(
            "An error occurred while downloading encrypted storage."
          );
        }
      }

      try {
        await dispatch({
          type: "load-after-login",
          storage: storageResult.value,
          encryptionKey: encryptionKey
        });
      } catch (e) {
        setIsLoggingIn(false);
        return setError(getErrorMessage(e));
      }
    },
    [dispatch, password, salt]
  );

  const onCancelClick = useCallback(() => {
    window.location.href = "#/";
  }, []);

  useEffect(() => {
    if (self || !email || !identityCommitment) {
      if (hasPendingRequest()) {
        window.location.hash = "#/login-interstitial";
      } else {
        window.location.hash = "#/";
      }
    }
  }, [self, email, identityCommitment]);

  // scroll to top when we navigate to this page
  useLayoutEffect(() => {
    document.body.scrollTop = document.documentElement.scrollTop = 0;
  }, []);

  if (self || !email || !identityCommitment) {
    return null;
  }

  const renderLoginInputs = (): JSX.Element => {
    /**
     * If a user has a `salt` field, then that means they chose their own password
     * and we saved the randomly generated salt for them. This is default true for
     * new PCDPass accounts, but false for Zupass accounts, where we give them a
     * Sync Key instead.
     */
    if (!salt) {
      return (
        <>
          <Input2
            autoCapitalize="off"
            autoCorrect="off"
            type="text"
            autoFocus
            defaultValue={email}
            disabled
          />
          <Button2 onClick={onLoginWithMasterPasswordClick}>
            Login with Sync Key
          </Button2>
        </>
      );
    }

    const loading = isLoggingIn || sendingConfirmationEmail;
    return (
      <StyledLoginForm onSubmit={onSubmitPassword}>
        <Input2
          autoCapitalize="off"
          autoCorrect="off"
          type="text"
          autoFocus
          defaultValue={email}
          disabled
        />
        <PasswordInput2
          autoFocus
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError(undefined);
          }}
          placeholder="Password"
          error={error}
        />
        <Button2 type="submit" disabled={loading}>
          {loading ? "Verifying..." : "Sign in  "}
        </Button2>
      </StyledLoginForm>
    );
  };

  return (
    <AppContainer bg="gray" fullscreen>
      <LoginContainer>
        <LoginTitleContainer>
          <Typography fontSize={24} fontWeight={800} color="#1E2C50">
            WELCOME BACK
          </Typography>
          <Typography
            fontSize={16}
            fontWeight={400}
            color="#1E2C50"
            family="Rubik"
          >
            We see you have an account, please login with your{" "}
            {salt ? "password" : "Sync Key"}.
          </Typography>
        </LoginTitleContainer>
        <InputsContainer>
          {renderLoginInputs()}
          <Button2 onClick={onCancelClick} variant="secondary">
            Cancel
          </Button2>
          <div onClick={onOverwriteClick} style={{ cursor: "pointer" }}>
            <Typography
              color={"#1E2C50"}
              fontSize={14}
              fontWeight={500}
              family="Rubik"
            >
              {salt ? "Forgot Password?" : "Lost Sync Key?"}
            </Typography>
          </div>
        </InputsContainer>
      </LoginContainer>
    </AppContainer>
  );
};

const InputsContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  gap: 8px;
  margin-bottom: 30px;
`;

const StyledLoginForm = styled(LoginForm)`
  margin-bottom: 0px;
`;
