import { useCallback, useState } from "react";
import { useDispatch, useQuery } from "../../src/appHooks";
import { sleep } from "../../src/util";
import {
  BackgroundGlow,
  BigInput,
  Button,
  CenterColumn,
  H2,
  Spacer,
  TextCenter
} from "../core";
import { RippleLoader } from "../core/RippleLoader";
import { MaybeModal } from "../modals/Modal";
import { AppContainer } from "../shared/AppContainer";

export function EnterConfirmationCodeScreen() {
  const dispatch = useDispatch();
  const query = useQuery();
  const email = query?.get("email");
  // todo: handle loading state
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
    await sleep(3000);
    await dispatch({ type: "login", email, token });
    setVerifyingCode(false);
  }, [dispatch, email, input]);

  const onCancelClick = useCallback(() => {
    window.location.href = "#/";
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
            <H2>ENTER CONFIRMATION CODE</H2>
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
                <Button onClick={onCreateClick}>Login</Button>
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
