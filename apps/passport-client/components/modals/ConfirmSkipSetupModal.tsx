import { Spacer } from "@pcd/passport-ui";
import { useCallback } from "react";
import { useDispatch } from "../../src/appHooks";
import { Button, CenterColumn, H2, TextCenter } from "../core";

interface ConfirmSkipSetupModalProps {
  onConfirm: () => void;
}

export function ConfirmSkipSetupModal({
  onConfirm
}: ConfirmSkipSetupModalProps): JSX.Element {
  const dispatch = useDispatch();

  const close = useCallback(() => {
    dispatch({ type: "set-modal", modal: { modalType: "none" } });
  }, [dispatch]);

  return (
    <CenterColumn w={420}>
      <Spacer h={64} />
      <H2>Skipping Password Setup</H2>
      <Spacer h={24} />
      <TextCenter>
        You are creating a Zupass without setting a password. This means that
        your PCDs will be encrypted by a key stored on our server. You can
        always set a password later to reinforce your account with
        end-to-end-encryption.
      </TextCenter>
      <Spacer h={24} />
      <CenterColumn>
        <Button style="danger" onClick={onConfirm}>
          I understand
        </Button>
        <Spacer h={8} />
        <Button onClick={close}>Cancel</Button>
      </CenterColumn>
    </CenterColumn>
  );
}
