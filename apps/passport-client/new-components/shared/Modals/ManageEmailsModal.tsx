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
  requestAddUserEmail,
  requestChangeUserEmail,
  requestRemoveUserEmail
} from "@pcd/passport-interface";
import { appConfig } from "../../../src/appConfig";
import { getEmailUpdateErrorMessage } from "../../../src/errorMessage";
import { getErrorMessage } from "@pcd/util";
import { PencilIcon, TrashIcon } from "@heroicons/react/24/solid";
import { NewLoader } from "../NewLoader";
import { Typography } from "../Typography";

enum EmailManagerState {
  addEmail = 1,
  getConfirmationCode,
  enterConfirmationCode,
  deleteEmail,
  changeEmail,
  changeEmailEnterConfirmationCode
}

export const ManageEmailModal = (): JSX.Element => {
  const self = useSelf();
  const dispatch = useDispatch();
  const activeBottomModal = useBottomModal();
  const emails = self?.emails;
  const stateContext = useStateContext();
  const [emailManagerState, setEmailManagerState] =
    useState<EmailManagerState>();
  const [_isPending, startTransition] = useTransition();

  const [newEmail, setNewEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState("");
  const [oldEmail, setOldEmail] = useState("");

  const [emailToRemove, setEmailToRemove] = useState("");
  const [emailToRemoveText, setEmailToRemoveText] = useState("");
  const errorOrLoading = !!error || loading;
  const reset = (): void => {
    startTransition((): void => {
      setConfirmationCode("");
      setNewEmail("");
      setOldEmail("");
      setError("");
      setEmailManagerState(undefined);
      setLoading(false);
      setEmailToRemoveText("");
    });
  };
  const pcds = usePCDCollection();

  const textOrLoader = (text: string): ReactNode => {
    if (loading) return <NewLoader columns={3} rows={2} color="white" />;
    return (
      <Typography color="inherit" fontSize={18} fontWeight={500} family="Rubik">
        {text}
      </Typography>
    );
  };
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
        return;
      }

      setEmailManagerState(
        EmailManagerState.changeEmail === emailManagerState
          ? EmailManagerState.changeEmailEnterConfirmationCode
          : EmailManagerState.enterConfirmationCode
      );
      setLoading(false);
    } catch (e) {
      setLoading(false);
      setError(getEmailUpdateErrorMessage(getErrorMessage(e)));
    }
  }, [loading, self, stateContext, pcds, newEmail, emailManagerState]);

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
      } else {
        setError(
          `Couldn't add '${newEmail}', please wait and try again later.`
        );
      }

      setTimeout(() => {
        setEmailManagerState(undefined);
        setLoading(false);
      }, 1000);
    } catch (e) {
      setLoading(false);
      setError(getEmailUpdateErrorMessage(getErrorMessage(e)));
    }
  }, [loading, self, stateContext, pcds, newEmail, confirmationCode, dispatch]);

  const onChangeEmail = useCallback(async () => {
    if (loading || !self) return;

    if (
      !confirm(
        "Are you sure you want to change your email? This action" +
          " may result in your tickets with your old email being deleted!"
      )
    ) {
      return;
    }

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

      const result = await requestChangeUserEmail(
        appConfig.zupassServer,
        oldEmail,
        newEmail,
        credential,
        confirmationCode
      );

      if (!result.success) {
        setError(getEmailUpdateErrorMessage(result.error));
        setLoading(false);
        return;
      }

      if (!result.value.newEmailList) {
        setError("Couldn't change email, please try again later.");
        setLoading(false);
        return;
      }

      await dispatch({
        type: "set-self",
        self: { ...self, emails: result.value.newEmailList }
      });
      stateContext.update({
        extraSubscriptionFetchRequested: true
      });

      setTimeout(() => {
        setEmailManagerState(undefined);
        setLoading(false);
      }, 1000);
    } catch (e) {
      setLoading(false);
      setError(getEmailUpdateErrorMessage(getErrorMessage(e)));
    }
  }, [
    loading,
    oldEmail,
    self,
    stateContext,
    pcds,
    newEmail,
    confirmationCode,
    dispatch
  ]);

  const onRemoveEmail = useCallback(async () => {
    if (loading || !self || !emailToRemove) return;

    if (
      !confirm(
        "Are you sure you want to remove this email? This action" +
          " may result in your tickets with that email being deleted!"
      )
    ) {
      return;
    }

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

      const response = await requestRemoveUserEmail(
        appConfig.zupassServer,
        emailToRemove,
        credential
      );

      if (!response.success) {
        setLoading(false);
        setError(getEmailUpdateErrorMessage(response.error));
        return;
      }

      await dispatch({
        type: "set-self",
        self: {
          ...self,
          emails: response.value.newEmailList
        }
      });
      reset();

      stateContext.update({
        extraSubscriptionFetchRequested: true
      });

      setTimeout(() => {
        setLoading(false);
        setEmailManagerState(undefined);
      }, 1000);
    } catch (e) {
      setLoading(false);
      setError(getEmailUpdateErrorMessage(getErrorMessage(e)));
    }
  }, [loading, self, stateContext, pcds, emailToRemove, dispatch]);

  const deleteEmailContainer = (
    <>
      <TextBlock>
        <Typography fontWeight={800} fontSize={20} color="var(--text-primary)">
          DELETE EMAIL
        </Typography>
        <Typography fontSize={16} color="var(--text-primary)">
          Please confirm if you want to delete this email from your account.{" "}
        </Typography>
      </TextBlock>
      <Input2
        variant="secondary"
        placeholder={emailToRemove}
        value={emailToRemoveText}
        onChange={(e) => setEmailToRemoveText(e.target.value)}
      />
      <ButtonsContainer>
        <Button2
          variant="danger"
          onClick={onRemoveEmail}
          disabled={errorOrLoading || emailToRemove !== emailToRemoveText}
        >
          {textOrLoader("Delete")}
        </Button2>
        {backBtn}
      </ButtonsContainer>
    </>
  );
  const changeEmailContainer = (
    <>
      <TextBlock>
        <Typography fontWeight={800} fontSize={20} color="var(--text-primary)">
          CHANGE EMAIL
        </Typography>
        <Typography fontSize={16} color="var(--text-primary)">
          Enter your new email address. We'll send a confirmation code to verify
          it.
        </Typography>
        <Typography fontSize={16} color="var(--text-primary)">
          The email you are about to change is:{" "}
          <Typography
            fontWeight={800}
            fontSize={16}
            color="var(--text-primary)"
          >
            {oldEmail}
          </Typography>
        </Typography>
      </TextBlock>
      <EmailInput
        email={newEmail}
        onChange={(e) => {
          setNewEmail(e.target.value);
          setError("");
        }}
        error={error}
      />
      {emailManagerState ===
        EmailManagerState.changeEmailEnterConfirmationCode && (
        <Input2
          variant="secondary"
          onChange={(e) => setConfirmationCode(e.target.value)}
          value={confirmationCode}
          error={error}
          placeholder="Enter confirmation code"
        />
      )}
      <ButtonsContainer>
        <Button2
          onClick={() => {
            emailManagerState ===
            EmailManagerState.changeEmailEnterConfirmationCode
              ? onChangeEmail()
              : sendConfirmationCode();
          }}
          disabled={errorOrLoading}
        >
          {textOrLoader(
            emailManagerState ===
              EmailManagerState.changeEmailEnterConfirmationCode
              ? "Change email"
              : "Get confirmation code"
          )}
        </Button2>

        {backBtn}
      </ButtonsContainer>
    </>
  );
  const emailListView = (
    <>
      <EmailsContainer>
        {emails?.map((email) => (
          <EmailInput
            email={email}
            canDelete={emails.length > 1}
            disabled
            onDelete={(): void => {
              setEmailToRemove(email);
              setEmailManagerState(EmailManagerState.deleteEmail);
            }}
            canEdit={emails.length === 1 && !emailManagerState}
            onEdit={(): void => {
              setOldEmail(email);
              setEmailManagerState(EmailManagerState.changeEmail);
            }}
          />
        ))}
        {emailManagerState === EmailManagerState.addEmail && (
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
            !emailManagerState
              ? setEmailManagerState(EmailManagerState.addEmail)
              : sendConfirmationCode();
          }}
          disabled={errorOrLoading}
        >
          {textOrLoader(
            !emailManagerState ? "Add email" : "Get confirmation code"
          )}
        </Button2>
        {backBtn}
      </ButtonsContainer>
    </>
  );

  const enterCodeContainer = (
    <>
      <Input2
        variant="secondary"
        onChange={(e) => setConfirmationCode(e.target.value)}
        value={confirmationCode}
        error={error}
        placeholder="Enter confirmation code"
      />
      <ButtonsContainer>
        <Button2
          onClick={() => {
            verifyCode();
            reset();
          }}
          disabled={errorOrLoading}
        >
          {textOrLoader("Verify")}
        </Button2>
        {backBtn}
      </ButtonsContainer>
    </>
  );

  const getComponentState = (
    state: EmailManagerState | undefined
  ): ReactNode => {
    switch (state) {
      case EmailManagerState.changeEmail:
      case EmailManagerState.changeEmailEnterConfirmationCode:
        return changeEmailContainer;
      case EmailManagerState.deleteEmail:
        return deleteEmailContainer;
      case EmailManagerState.enterConfirmationCode:
        return enterCodeContainer;
      default:
        return emailListView;
    }
  };
  return (
    <BottomModal
      onClickOutside={() => reset()}
      isOpen={activeBottomModal.modalType === "manage-emails"}
    >
      <Container>{getComponentState(emailManagerState)}</Container>
    </BottomModal>
  );
};

const IconsContainer = styled.div`
  position: absolute;
  display: flex;
  flex-direction: row;
  gap: 8px;
  top: 50%;
  transform: translateY(-50%);
  right: 24px;
`;

const EmailInputContainer = styled.div`
  position: relative;
`;
const EmailInput = ({
  email,
  onChange,
  disabled,
  error,
  onEdit,
  canEdit,
  onDelete,
  canDelete
}: {
  email: string;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  disabled?: boolean;
  error?: string;
  onEdit?: () => void;
  canEdit?: boolean;
  onDelete?: () => void;
  canDelete?: boolean;
}): JSX.Element => {
  return (
    <EmailInputContainer>
      <Input2
        error={error}
        disabled={disabled}
        placeholder="Email"
        variant="secondary"
        value={email}
        onChange={onChange}
      />
      {disabled && (
        <IconsContainer>
          {canEdit && (
            <PencilIcon
              style={{ cursor: "pointer" }}
              color="var(--core-accent)"
              width={20}
              height={20}
              onClick={onEdit}
            />
          )}
          {canDelete && (
            <TrashIcon
              style={{ cursor: "pointer" }}
              color="var(--core-accent)"
              width={20}
              height={20}
              onClick={onDelete}
            />
          )}
        </IconsContainer>
      )}
    </EmailInputContainer>
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

const TextBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
`;
