import { useCallback, useState } from "react";
import { useDispatch, useQuery } from "../../src/appHooks";
import {
  BackgroundGlow,
  BigInput,
  Button,
  CenterColumn,
  H2,
  Spacer,
  TextCenter
} from "../core";
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
    setVerifyingCode(true);
    // todo: handle dev mode
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
            />
            <Spacer h={8} />
            <Button onClick={onCreateClick}>Login</Button>
            <Spacer h={8} />
            <Button onClick={onCancelClick}>Cancel</Button>
          </CenterColumn>
        </BackgroundGlow>
      </AppContainer>
    </>
  );
}
