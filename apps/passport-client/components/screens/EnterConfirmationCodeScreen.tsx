import { requestVerifyToken } from "@pcd/passport-interface";
import { ZUPASS_SENDER_EMAIL } from "@pcd/util";
import { useCallback, useLayoutEffect, useState } from "react";
import { appConfig } from "../../src/appConfig";
import { useQuery } from "../../src/appHooks";
import {
  BigInput,
  Button,
  CenterColumn,
  H2,
  HR,
  Spacer,
  TextCenter
} from "../core";
import { ConfirmationCodeInput } from "../core/Input";
import { RippleLoader } from "../core/RippleLoader";
import { MaybeModal } from "../modals/Modal";
import { AppContainer } from "../shared/AppContainer";
import { InlineError } from "../shared/InlineError";
import { ResendCodeButton } from "../shared/ResendCodeButton";

export function EnterConfirmationCodeScreen(): JSX.Element {
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

  let content = null;

  if (verifyingCode) {
    content = (
      <>
        <Spacer h={128} />
        <RippleLoader />
        <Spacer h={24} />
        <TextCenter>Verifying code...</TextCenter>
      </>
    );
  } else {
    content = (
      <>
        <Spacer h={64} />
        <TextCenter>
          <H2>Enter Confirmation Code</H2>
          <Spacer h={24} />
          Check your inbox for an email from <span>{ZUPASS_SENDER_EMAIL}</span>.
          Use the most recent code you received to continue. If you don't see
          the email in your inbox, make sure to check your spam folder.
          <Spacer h={16} />
          {isReset && (
            <>
              Once you reset your account, you'll lose access to all your PODs!
            </>
          )}
        </TextCenter>
        <Spacer h={24} />
        <CenterColumn>
          <BigInput value={email} disabled />
          <Spacer h={8} />
          <ConfirmationCodeInput
            autoFocus
            value={input}
            onChange={(e): void => setInput(e.target.value.replace(/\D/g, ""))}
            placeholder="confirmation code"
            disabled={verifyingCode}
          />
          <InlineError error={error} />
          <Spacer h={8} />
          <Button onClick={onCreateClick}>Continue</Button>
          <Spacer h={24} />
          <HR />
          <Spacer h={24} />
          <ResendCodeButton email={email} />
          <Spacer h={8} />
          <Button onClick={onCancelClick} style="secondary">
            Cancel
          </Button>
        </CenterColumn>
      </>
    );
  }

  return (
    <>
      <MaybeModal />
      <AppContainer bg="primary">{content}</AppContainer>
    </>
  );
}
