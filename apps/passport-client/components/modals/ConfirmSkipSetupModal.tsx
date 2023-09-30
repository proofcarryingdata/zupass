import { Spacer } from "@pcd/passport-ui";
import { useCallback } from "react";
import styled from "styled-components";
import { useDispatch } from "../../src/appHooks";
import { Button, H1 } from "../core";

interface ConfirmSkipSetupModalProps {
  onConfirm: () => void;
}

export function ConfirmSkipSetupModal({
  onConfirm
}: ConfirmSkipSetupModalProps) {
  const dispatch = useDispatch();

  const close = useCallback(() => {
    dispatch({ type: "set-modal", modal: { modalType: "none" } });
  }, [dispatch]);

  return (
    <Container>
      <Spacer h={8} />
      <H1>Warning</H1>
      <Spacer h={24} />
      <p>
        You are creating a Zupass without setting a password. This means that
        your non-ticket PCDs will be encrypted by a key stored on our server.
        You can always set a password later to add end-to-end-encryption.
      </p>
      <Spacer h={24} />
      <Button style="danger" onClick={onConfirm}>
        I understand
      </Button>
      <Spacer h={8} />
      <Button onClick={close}>Cancel</Button>
    </Container>
  );
}

const Container = styled.div`
  padding: 24px;
`;
