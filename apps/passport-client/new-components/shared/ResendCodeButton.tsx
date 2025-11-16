import { requestConfirmationEmail } from "@pcd/passport-interface";
import { useCallback, useEffect, useState } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import styled from "styled-components";
import { appConfig } from "../../src/appConfig";
import { Typography } from "./Typography";

interface ResendCodeButtonProps {
  email: string;
}

export function ResendCodeButton2({
  email
}: ResendCodeButtonProps): JSX.Element {
  // If not zero, this is the number of seconds the user will have
  // to wait before clicking this button again. Technically, this
  // frontend check doesn't really matter for sophisticated actors,
  // because our defense against spammers should happen with rate
  // limiting at the API layer.
  const [waitCountInSeconds, setWaitCount] = useState(10);
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | undefined>();
  const requiresCaptcha = !!appConfig.turnstileSiteKey;

  const startTimer = useCallback(() => {
    // We need a local variable `timer` because relying on React state
    // will have us stuck within the setInterval().
    let timer = 10;
    setWaitCount(10);

    const countdown = setInterval(() => {
      timer -= 1;
      setWaitCount(timer);

      if (timer === 0) {
        clearInterval(countdown);
      }
    }, 1000);
  }, []);

  useEffect(() => {
    startTimer();
  }, [startTimer]);

  const sendEmail = useCallback(
    async (token?: string) => {
      await requestConfirmationEmail(
        appConfig.zupassServer,
        email,
        true,
        token
      );
      startTimer();
      // Reset captcha token after use
      setCaptchaToken(undefined);
      setShowCaptcha(false);
    },
    [email, startTimer]
  );

  const handleClick = async (): Promise<void> => {
    // If captcha is required, show it first
    if (requiresCaptcha && !captchaToken) {
      setShowCaptcha(true);
      return;
    }

    await sendEmail(captchaToken);
  };

  // Auto-send email once captcha is verified
  useEffect(() => {
    if (showCaptcha && captchaToken) {
      sendEmail(captchaToken);
    }
  }, [captchaToken, showCaptcha, sendEmail]);

  const disabled = waitCountInSeconds > 0;

  if (showCaptcha && requiresCaptcha) {
    return (
      <ResendCodeContainer>
        <Typography
          fontSize={14}
          fontWeight={400}
          color="#1E2C50"
          family="Rubik"
          style={{ textAlign: "center", marginBottom: "8px" }}
        >
          Please verify you're human to resend code
        </Typography>
        <Turnstile
          siteKey={appConfig.turnstileSiteKey!}
          onSuccess={(token) => {
            setCaptchaToken(token);
          }}
          onError={() => {
            setCaptchaToken(undefined);
            setShowCaptcha(false);
          }}
          onExpire={() => {
            setCaptchaToken(undefined);
          }}
        />
        <Typography
          color={"#1E2C50"}
          fontSize={14}
          fontWeight={500}
          family="Rubik"
          style={{ cursor: "pointer", marginTop: "8px", textAlign: "center" }}
          onClick={() => {
            setShowCaptcha(false);
            setCaptchaToken(undefined);
          }}
        >
          Cancel
        </Typography>
      </ResendCodeContainer>
    );
  }

  return (
    <ResendCodeButtonContainer
      onClick={() => {
        if (disabled) return;
        handleClick();
      }}
    >
      <Typography
        color={"#1E2C50"}
        fontSize={14}
        fontWeight={500}
        family="Rubik"
        opacity={disabled ? 0.4 : 1}
      >
        {disabled ? `Resend code (${waitCountInSeconds})` : "Resend code"}
      </Typography>
    </ResendCodeButtonContainer>
  );
}

const ResendCodeButtonContainer = styled.div`
  cursor: pointer;
  user-select: none;
`;

const ResendCodeContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  margin-top: 8px;
`;
