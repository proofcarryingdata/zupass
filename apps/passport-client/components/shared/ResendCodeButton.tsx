import { requestConfirmationEmail } from "@pcd/passport-interface";
import { useState } from "react";
import { appConfig } from "../../src/appConfig";
import { useIdentity } from "../../src/appHooks";
import { Button } from "../core";

interface ResendCodeButtonProps {
  email: string;
}

export function ResendCodeButton({ email }: ResendCodeButtonProps) {
  const identity = useIdentity();
  // If not zero, this is the number of seconds the user will have
  // the wait before clicking this button again. Technically, this
  // frontend check doesn't really matter for sophisticated actors
  // because our defense against spammers should happen with rate
  // limiting at the API layer, but this is still useful to have.
  const [waitCountInSeconds, setWaitCount] = useState(0);
  const handleClick = async (event: React.FormEvent<HTMLButtonElement>) => {
    event.preventDefault();
    console.log("handling click");
    await requestConfirmationEmail(
      appConfig.passportServer,
      appConfig.isZuzalu,
      email,
      identity.commitment.toString(),
      false
    );

    // We need a local variable `timer` because relying on state will have us stuck
    // within the setInterval().
    let timer = 10;
    setWaitCount(10);

    const countdown = setInterval(() => {
      timer -= 1;
      setWaitCount(timer);

      if (timer === 0) {
        clearInterval(countdown);
      }
    }, 1000);
  };

  const disabled = waitCountInSeconds > 0;

  return (
    <Button disabled={disabled} onClick={handleClick}>
      {disabled ? `Resend code (${waitCountInSeconds})` : "Resend code"}
    </Button>
  );
}
