import styled from "styled-components";

import {
  useBottomModal,
  useDispatch,
  usePCDCollection,
  useSelf,
  useStateContext
} from "../../../src/appHooks";
import { BottomModal } from "../BottomModal";
import { Button2 } from "../Button";
import { Input2 } from "../Input";
import {
  ChangeEventHandler,
  ReactNode,
  useCallback,
  useState,
  useTransition
} from "react";
import { validate } from "email-validator";
import {
  CredentialManager,
  requestAddUserEmail
} from "@pcd/passport-interface";
import { appConfig } from "../../../src/appConfig";
import { getEmailUpdateErrorMessage } from "../../../src/errorMessage";
import { getErrorMessage } from "@pcd/util";

enum EmailManagerState {
  addEmail = 1,
  getConfirmationCode,
  enterConfirmationCode,
  finish
}

export const ManageEmailModal = (): JSX.Element => {
  const self = useSelf();
  const dispatch = useDispatch();
  const activeBottomModal = useBottomModal();
  const emails = self?.emails;
  const stateContext = useStateContext();
  const [addEmailState, setAddEmailState] = useState<EmailManagerState>();
  const [_isPending, startTransition] = useTransition();

  const [newEmail, setNewEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState("");
  const reset = (): void => {
    startTransition((): void => {
      setConfirmationCode("");
      setNewEmail("");
      setError("");
      setAddEmailState(undefined);
      setLoading(false);
    });
  };
  const pcds = usePCDCollection();

  const backBtn = (
    <Button2
      onClick={() => {
        dispatch({
          type: "set-bottom-modal",
          modal: { modalType: "settings" }
        });
        reset();
      }}
      variant="secondary"
    >
      Back
    </Button2>
  );
  const sendConfirmationCode = useCallback(async () => {
    if (loading || !self) return;

    if (!validate(newEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const credential = await new CredentialManager(
        stateContext.getState().identityV3,
        pcds,
        stateContext.getState().credentialCache
      ).requestCredential({
        signatureType: "sempahore-signature-pcd",
        pcdType: "email-pcd"
      });

      const response = await requestAddUserEmail(
        appConfig.zupassServer,
        newEmail,
        credential
      );

      if (response.success && response.value.token) {
        setConfirmationCode(response.value.token);
      } else if (!response.success) {
        setError(getEmailUpdateErrorMessage(response.error));
        setLoading(false);
      }

      setAddEmailState(EmailManagerState.enterConfirmationCode);
      setLoading(false);
    } catch (e) {
      setLoading(false);
      setError(getEmailUpdateErrorMessage(getErrorMessage(e)));
    }
  }, [loading, self, stateContext, pcds, newEmail]);

  const verifyCode = useCallback(async () => {
    if (loading || !self) return;

    setLoading(true);
    setError("");

    try {
      const credential = await new CredentialManager(
        stateContext.getState().identityV3,
        pcds,
        stateContext.getState().credentialCache
      ).requestCredential({
        signatureType: "sempahore-signature-pcd",
        pcdType: "email-pcd"
      });

      const response = await requestAddUserEmail(
        appConfig.zupassServer,
        newEmail,
        credential,
        confirmationCode
      );

      if (!response.success) {
        setError(getEmailUpdateErrorMessage(response.error));
        setLoading(false);
        return;
      }

      if (response.value.newEmailList) {
        await dispatch({
          type: "set-self",
          self: { ...self, emails: [...response.value.newEmailList] }
        });
        stateContext.update({
          extraSubscriptionFetchRequested: true
        });
        setAddEmailState(undefined);
      } else {
        setError(
          `Couldn't add '${newEmail}', please wait and try again later.`
        );
      }

      setTimeout(() => {
        setAddEmailState(undefined);
        setLoading(false);
      }, 1000);
    } catch (e) {
      setLoading(false);
      setError(getEmailUpdateErrorMessage(getErrorMessage(e)));
    }
  }, [loading, self, stateContext, pcds, newEmail, confirmationCode, dispatch]);
  const addEmailContainer = (
    <>
      <EmailsContainer>
        {emails?.map((email) => <EmailInput email={email} disabled />)}
        {addEmailState === EmailManagerState.addEmail && (
          <EmailInput
            email={newEmail}
            onChange={(e) => {
              setNewEmail(e.target.value);
              setError("");
            }}
            error={error}
          />
        )}
      </EmailsContainer>
      <ButtonsContainer>
        <Button2
          onClick={() => {
            !addEmailState
              ? setAddEmailState(EmailManagerState.addEmail)
              : sendConfirmationCode();
          }}
        >
          {!addEmailState ? "Add email" : "Get confirmation code"}
        </Button2>
        {backBtn}
      </ButtonsContainer>
    </>
  );

  const enterCodeContainer = (
    <>
      <Input2
        onChange={(e) => setConfirmationCode(e.target.value)}
        value={confirmationCode}
        error={error}
        placeholder="Enter confirmation code"
      />
      <ButtonsContainer>
        <Button2
          onClick={() => {
            verifyCode();
          }}
        >
          Verify
        </Button2>
        {backBtn}
      </ButtonsContainer>
    </>
  );

  const getComponentState = (
    state: EmailManagerState | undefined
  ): ReactNode => {
    switch (state) {
      case EmailManagerState.enterConfirmationCode:
        return enterCodeContainer;
      default:
        return addEmailContainer;
    }
  };
  return (
    <BottomModal isOpen={activeBottomModal.modalType === "manage-emails"}>
      <Container>{getComponentState(addEmailState)}</Container>
    </BottomModal>
  );
};

const EmailInput = ({
  email,
  onChange,
  disabled,
  error
}: {
  email: string;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  disabled?: boolean;
  error?: string;
}): JSX.Element => {
  return (
    <Input2
      error={error}
      disabled={disabled}
      placeholder="Email"
      variant="secondary"
      value={email}
      onChange={onChange}
    />
  );
};

const EmailsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ButtonsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;
