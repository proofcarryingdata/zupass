import { useCallback, useState } from "react";
import { useDispatch, useQuery } from "../../src/appHooks";
import {
  BackgroundGlow,
  BigInput,
  Button,
  CenterColumn,
  Spacer,
  TextCenter
} from "../core";
import { MaybeModal } from "../modals/Modal";
import { AppContainer } from "../shared/AppContainer";

export function EnterConfirmationCodeScreen() {
  const dispatch = useDispatch();
  const query = useQuery();
  const email = query?.get("email");
  const identityCommitment = query?.get("identityCommitment");

  const [verifyingCode, setVerifyingCode] = useState(false);
  const [input, setInput] = useState("");

  const onOverwriteClick = useCallback(async () => {
    const token = input;
    setVerifyingCode(true);
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
          <TextCenter> enter confirmation code</TextCenter>
          <Spacer h={24} />
          <CenterColumn w={280}>
            <BigInput
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <Spacer h={16} />
            <Button onClick={onOverwriteClick} style="danger">
              Overwrite
            </Button>
            <Spacer h={16} />
            <Button onClick={onCancelClick}>Cancel</Button>
          </CenterColumn>
        </BackgroundGlow>
      </AppContainer>
    </>
  );
}
