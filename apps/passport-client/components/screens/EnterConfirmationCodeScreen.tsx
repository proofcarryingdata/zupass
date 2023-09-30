import { useCallback, useLayoutEffect, useState } from "react";
import { useDispatch, useQuery } from "../../src/appHooks";
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
import { ResendCodeButton } from "../shared/ResendCodeButton";

export function EnterConfirmationCodeScreen() {
  const dispatch = useDispatch();
  const query = useQuery();
  const email = query?.get("email");
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [input, setInput] = useState("");

  const onCreateClick = useCallback(async () => {
    const token = input;

    if (token === "") {
      dispatch({
        type: "error",
        error: {
          title: "Enter Token",
          message:
            "Check your email for an access token from passport@0xparc.org",
          dismissToCurrentPage: true
        }
      });
      return;
    }
    setVerifyingCode(true);
    await dispatch({ type: "verify-token", email, token });
    setVerifyingCode(false);
  }, [dispatch, email, input]);

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
      <TextCenter>
        <Spacer h={128} />
        Verifying code
        <Spacer h={24} />
        <RippleLoader />
      </TextCenter>
    );
  } else {
    content = (
      <>
        <Spacer h={64} />
        <TextCenter>
          <H2>Enter Confirmation Code</H2>
          <Spacer h={24} />
          We've sent you a confirmation code, please enter it below to set up
          your account.
        </TextCenter>
        <Spacer h={24} />
        <BigInput value={email} disabled />
        <Spacer h={8} />
        <BigInput
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="confirmation code"
          disabled={verifyingCode}
        />
        <Spacer h={8} />
        <Button onClick={onCreateClick}>Continue</Button>
        <Spacer h={24} />
        <HR />
        <Spacer h={24} />
        <ResendCodeButton email={email} />
        <Spacer h={8} />
        <Button onClick={onCancelClick}>Cancel</Button>
      </>
    );
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
          <CenterColumn w={280}>{content}</CenterColumn>
        </BackgroundGlow>
      </AppContainer>
    </>
  );
}
