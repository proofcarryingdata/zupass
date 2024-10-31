import { requestConfirmationEmail } from "@pcd/passport-interface";
import { useCallback, useEffect, useState } from "react";
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

  const handleClick = async (): Promise<void> => {
    await requestConfirmationEmail(appConfig.zupassServer, email, true);
    startTimer();
  };

  const disabled = waitCountInSeconds > 0;

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
