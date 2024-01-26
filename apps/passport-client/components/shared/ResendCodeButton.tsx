import { requestConfirmationEmail } from "@pcd/passport-interface";
import { useCallback, useEffect, useState } from "react";
import { appConfig } from "../../src/appConfig";
import { useIdentity } from "../../src/appHooks";
import { Button } from "../core";

interface ResendCodeButtonProps {
  email: string;
}

export function ResendCodeButton({
  email
}: ResendCodeButtonProps): JSX.Element {
  const identity = useIdentity();
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

  const handleClick = async (
    event: React.FormEvent<HTMLButtonElement>
  ): Promise<void> => {
    event.preventDefault();
    console.log("handling click");
    await requestConfirmationEmail(
      appConfig.zupassServer,
      email,
      identity.commitment.toString(),
      true
    );
    startTimer();
  };

  const disabled = waitCountInSeconds > 0;

  return (
    <Button disabled={disabled} onClick={handleClick} style="secondary">
      {disabled ? `Resend code (${waitCountInSeconds})` : "Resend code"}
    </Button>
  );
}
