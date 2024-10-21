import { requestVerifyToken } from "@pcd/passport-interface";
import { ZUPASS_SENDER_EMAIL } from "@pcd/util";
import { useCallback, useLayoutEffect, useState } from "react";
import styled from "styled-components";
import { AppContainer } from "../../../components/shared/AppContainer";
import { appConfig } from "../../../src/appConfig";
import { useQuery } from "../../../src/appHooks";
import { Button2 } from "../../shared/Button";
import { Input2 } from "../../shared/Input";
import {
  LoginContainer,
  LoginTitleContainer
} from "../../shared/Login/LoginComponents";
import { ResendCodeButton2 } from "../../shared/ResendCodeButton";
import { Typography } from "../../shared/Typography";

export const NewEnterConfirmationCodeScreen = (): JSX.Element => {
  const query = useQuery();
  const email = query?.get("email") ?? "";
  const isReset = query?.get("isReset");
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | undefined>();

  const onCreateClick = useCallback(async () => {
    const token = input;

    if (token === "") {
      return setError(
        `Check your email for an access token from ${ZUPASS_SENDER_EMAIL}, and enter it here.`
      );
    }

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
    } else {
      setError("The code you entered is incorrect");
    }
  }, [email, input]);

  const onCancelClick = useCallback(() => {
    window.location.href = "#/";
  }, []);

  // scroll to top when we navigate to this page
  useLayoutEffect(() => {
    document.body.scrollTop = document.documentElement.scrollTop = 0;
  }, []);

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
            recent code you received to continue. If you don’t see the email in
            your inbox, make sure to check your spam folder. <br />{" "}
            {isReset && (
              <>
                Once you reset your account, you'll lose access to all your
                PCDs!
              </>
            )}
          </Typography>
        </LoginTitleContainer>
        <Input2
          autoCapitalize="off"
          autoCorrect="off"
          type="text"
          autoFocus
          placeholder="Email"
          defaultValue={email}
          disabled
        />
        <Input2
          variant="primary"
          type="number"
          pattern="[0-9]*"
          inputMode="numeric"
          value={input}
          onChange={(e): void => {
            setInput(e.target.value.replace(/\D/g, ""));
            setError(undefined);
          }}
          autoFocus
          placeholder="6 digit code"
          error={error}
          hideArrows
        />

        <InputsContainer>
          <Button2 disabled={verifyingCode} onClick={onCreateClick}>
            {verifyingCode ? "Verifying" : "Enter"}
          </Button2>
          <Button2 onClick={onCancelClick} variant="secondary">
            Cancel
          </Button2>
          <ResendCodeButton2 email={email} />
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
