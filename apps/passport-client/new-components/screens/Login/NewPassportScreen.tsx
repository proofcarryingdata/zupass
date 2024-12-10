import {
  ConfirmEmailResult,
  getNamedAPIErrorMessage,
  requestConfirmationEmail,
  requestDownloadAndDecryptStorage,
  requestPasswordSalt,
  requestVerifyToken
} from "@pcd/passport-interface";
import { getErrorMessage, sleep } from "@pcd/util";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { AppContainer } from "../../../components/shared/AppContainer";
import { appConfig } from "../../../src/appConfig";
import { useDispatch, useIdentityV3, useQuery } from "../../../src/appHooks";
import { err } from "../../../src/util";
import { Button2 } from "../../shared/Button";
import { Input2 } from "../../shared/Input";
import {
  LoginContainer,
  LoginForm,
  LoginTitleContainer
} from "../../shared/Login/LoginComponents";
import { NewLoader } from "../../shared/NewLoader";
import { ResendCodeButton2 } from "../../shared/ResendCodeButton";
import { Typography } from "../../shared/Typography";

export const NewPassportScreen2 = (): JSX.Element | null => {
  const query = useQuery();
  const email = query?.get("email");

  useEffect(() => {
    if (!email) {
      window.location.hash = "#/";
    }
  }, [email]);

  if (!email) {
    return null;
  }
  return <SendEmailVerification email={email} />;
};

const SendEmailVerification = ({
  email
}: {
  email: string;
}): JSX.Element | null => {
  const navigate = useNavigate();
  const identity = useIdentityV3();
  const dispatch = useDispatch();
  const [error, setError] = useState<string | undefined>();
  const [triedSendingEmail, setTriedSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [loadingAccount, setLoadingAccount] = useState(false);
  const [token, setToken] = useState("");
  const loadingPage = loadingAccount || emailSending || !emailSent;

  const verifyToken = useCallback(
    async (token: string) => {
      if (verifyingCode || loadingAccount) return;

      if (token === "") {
        setError("Enter confirmation code");
        return;
      }

      setVerifyingCode(true);
      const verifyTokenResult = await requestVerifyToken(
        appConfig.zupassServer,
        email,
        token
      );

      setVerifyingCode(false);

      if (verifyTokenResult.success) {
        setLoadingAccount(true);
        try {
          const encryptionKey = verifyTokenResult.value?.encryptionKey;
          if (encryptionKey) {
            const storageResult = await requestDownloadAndDecryptStorage(
              appConfig.zupassServer,
              encryptionKey
            );

            if (storageResult.success) {
              await dispatch({
                type: "load-after-login",
                storage: storageResult.value,
                encryptionKey
              });
            } else {
              setError(
                `An error occurred while downloading encrypted storage [
                  ${getNamedAPIErrorMessage(
                    storageResult.error
                  )}].  If this persists, contact support@zupass.org.`
              );
            }
          } else {
            await sleep();
            await dispatch({
              type: "create-user-skip-password",
              email,
              token,
              targetFolder: undefined,
              autoRegister: false
            });
          }
        } catch (e) {
          if (
            e instanceof Error &&
            (e.name === "QuotaExceededError" ||
              e.message.includes("QuotaExceededError") ||
              e.message.includes("storage quota"))
          ) {
            setError(
              `Your browser does not have enough storage space for your account data. Try logging in using a desktop browser and deleting some data from your account.`
            );
          } else {
            setError(
              `An error occurred loading account info: [${getErrorMessage(e)}
            ].  If this persists, contact support@zupass.org.`
            );
          }
        }
        setLoadingAccount(false);
      } else {
        setError("Invalid confirmation code");
      }
    },
    [email, verifyingCode, loadingAccount, dispatch]
  );

  const handleConfirmationEmailResult = useCallback(
    async (result: ConfirmEmailResult) => {
      if (!result.success) {
        if (!result.error.includes("already registered")) {
          return err(dispatch, "Email failed", result.error);
        }

        setLoadingAccount(true);
        const saltResult = await requestPasswordSalt(
          appConfig.zupassServer,
          email
        );
        setLoadingAccount(false);

        if (saltResult.success) {
          window.location.href = `#/already-registered?email=${encodeURIComponent(
            email
          )}&identityCommitment=${encodeURIComponent(
            identity.commitment.toString()
          )}&salt=${encodeURIComponent(saltResult.value as string)}`;
        } else {
          err(dispatch, "Email failed", saltResult.error);
        }
      } else if (result.value?.devToken) {
        verifyToken(result.value.devToken);
      } else {
        setEmailSent(true);
      }
    },
    [dispatch, email, identity.commitment, verifyToken]
  );

  const doRequestConfirmationEmail = useCallback(async () => {
    setEmailSending(true);
    const confirmationEmailResult = await requestConfirmationEmail(
      appConfig.zupassServer,
      email,
      false
    );
    setEmailSending(false);

    handleConfirmationEmailResult(confirmationEmailResult);
  }, [email, handleConfirmationEmailResult]);

  useEffect(() => {
    if (triedSendingEmail) return;
    setTriedSendingEmail(true);
    doRequestConfirmationEmail();
  }, [triedSendingEmail, doRequestConfirmationEmail]);

  // Verify the code the user entered.
  const onSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      verifyToken(token);
    },
    [verifyToken, token]
  );

  if (loadingPage) {
    let loaderText = "";
    if (verifyingCode) {
      loaderText = "VERIFYING TOKEN...";
    } else if (loadingAccount) {
      loaderText = "LOADING ACCOUNT INFORMATION...";
    } else if (emailSending) {
      loaderText = "CHECKING IF YOU HAVE AN ACCOUNT...";
    }
    return (
      <AppContainer fullscreen={true} bg="gray">
        <LoadingScreenContainer>
          <NewLoader columns={5} rows={5} />
          <Typography
            fontSize={18}
            fontWeight={800}
            color="var(--text-tertiary)"
            style={{ textAlign: "center" }}
          >
            {loaderText}
          </Typography>
        </LoadingScreenContainer>
      </AppContainer>
    );
  }

  return (
    <AppContainer bg="gray" fullscreen>
      <LoginContainer>
        <LoginTitleContainer>
          <Typography fontSize={24} fontWeight={800} color="#1E2C50">
            ENTER CONFIRMATION CODE
          </Typography>
          <Typography
            fontSize={16}
            fontWeight={400}
            color="#1E2C50"
            family="Rubik"
          >
            Check your inbox for an email from noreply@zupass.org. Use the most
            recent code you received to continue.
          </Typography>
        </LoginTitleContainer>
        <LoginForm onSubmit={onSubmit}>
          <Input2 variant="primary" value={email} />
          <Input2
            variant="primary"
            type="number"
            pattern="[0-9]*"
            inputMode="numeric"
            value={token}
            onChange={(e): void => {
              setToken(e.target.value.replace(/\D/g, ""));
              setError(undefined);
            }}
            autoFocus
            placeholder="6 digit code"
            error={error}
            hideArrows
          />
          <Button2 variant="primary" disabled={verifyingCode} type="submit">
            {!verifyingCode ? "Verify" : "Verifying..."}
          </Button2>
          <Button2 variant="secondary" onClick={() => navigate("/")}>
            Cancel
          </Button2>
          <ResendCodeButton2 email={email} />
        </LoginForm>
      </LoginContainer>
    </AppContainer>
  );
};

const LoadingScreenContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin: auto 0;
`;
