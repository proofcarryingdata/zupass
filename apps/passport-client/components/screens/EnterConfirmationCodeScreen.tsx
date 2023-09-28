import { useCallback, useLayoutEffect, useState } from "react";
import { useDispatch, useQuery } from "../../src/appHooks";
import {
  BackgroundGlow,
  BigInput,
  Button,
  CenterColumn,
  H1,
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

  return (
    <>
      <MaybeModal />
      <AppContainer bg="primary">
        <BackgroundGlow
          y={224}
          from="var(--bg-lite-primary)"
          to="var(--bg-dark-primary)"
        >
          <Spacer h={64} />
          <TextCenter>
            <H1>PCDPASS</H1>
          </TextCenter>
          <Spacer h={32} />
          <TextCenter>
            We've sent you a confirmation code, please enter it below to set up
            your account.
          </TextCenter>
          <Spacer h={24} />
          <CenterColumn w={280}>
            <BigInput value={email} disabled />
            <Spacer h={8} />
            <BigInput
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="confirmation code"
              disabled={verifyingCode}
            />
            {verifyingCode ? (
              <>
                <Spacer h={16} />
                <RippleLoader />
              </>
            ) : (
              <>
                <Spacer h={8} />
                <Button onClick={onCreateClick}>Continue</Button>
                <Spacer h={8} />
                <ResendCodeButton email={email} />
                <Spacer h={8} />
                <Button onClick={onCancelClick}>Cancel</Button>
              </>
            )}
          </CenterColumn>
        </BackgroundGlow>
      </AppContainer>
    </>
  );
}
