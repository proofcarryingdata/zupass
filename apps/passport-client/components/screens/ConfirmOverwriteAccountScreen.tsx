import { useCallback, useState } from "react";
import { requestLoginCode } from "../../src/api/user";
import { useDispatch, useQuery } from "../../src/appHooks";
import { err } from "../../src/util";
import { BigInput, Button, Spacer } from "../core";

export function ConfirmOverwriteAccountScreen() {
  const dispatch = useDispatch();
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const query = useQuery();
  const email = query?.get("email");
  const identityCommitment = query?.get("identityCommitment");

  const onEmailSuccess = useCallback(
    (devToken: string | undefined) => {
      if (devToken === undefined) {
        setEmailSent(true);
        window.location.href = `#/enter-confirmation-code?email=${encodeURIComponent(
          email
        )}&identityCommitment=${encodeURIComponent(identityCommitment)}`;
      } else {
        dispatch({ type: "login", email, token: devToken });
      }
    },
    [dispatch, email, identityCommitment]
  );

  const onOverwriteClick = useCallback(() => {
    requestLoginCode(email, identityCommitment, true)
      .then(onEmailSuccess)
      .catch((e) => err(dispatch, "Email failed", e.message));
  }, [dispatch, email, identityCommitment, onEmailSuccess]);

  const onNeverMindClick = useCallback(() => {
    window.location.href = "#/";
  }, []);

  return (
    <div>
      <div>you've already registered, are you sure?</div>
      <BigInput value={email} disabled />
      <Spacer h={16} />
      <Button onClick={onOverwriteClick} style="danger">
        Overwrite
      </Button>
      <Spacer h={16} />
      <Button onClick={onNeverMindClick}>Never Mind</Button>
    </div>
  );
}
