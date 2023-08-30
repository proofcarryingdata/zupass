import { useCallback, useState } from "react";
import { requestLoginCode } from "../../src/api/user";
import { useDispatch, useQuery } from "../../src/appHooks";
import { err } from "../../src/util";
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
            <div>you've already registered, are you sure?</div>
          </TextCenter>
          <Spacer h={24} />
          <CenterColumn w={280}>
            <BigInput value={email} disabled />
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
