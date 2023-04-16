import React, { useCallback, useContext, useState } from "react";
import styled from "styled-components";
import { DispatchContext } from "../../src/dispatch";
import { Button, CenterColumn, H2, Spacer, TextCenter } from "../core";
import { Modal } from "./Modal";

export function SaveSyncModal() {
  const [state, dispatch] = useContext(DispatchContext);
  const syncKey = state.encryptionKey;

  const [justCopied, setJustCopied] = useState(false);
  const copyKey = useCallback(() => {
    window.navigator.clipboard.writeText(syncKey);
    setJustCopied(true);
    setTimeout(() => setJustCopied(false), 2000);
  }, [syncKey]);

  const close = useCallback(() => {
    localStorage["savedSyncKey"] = "true";
    dispatch({ type: "set-modal", modal: "" });
  }, [dispatch]);

  if (syncKey == null) return null;

  return (
    <Modal>
      <Wrap>
        <TextCenter>
          <H2>WELCOME TO ZUPASS</H2>
        </TextCenter>
        <Spacer h={32} />
        <TextCenter>
          <strong>Please save your sync key.</strong> This key secures your
          passport and lets you log in on different devices.
        </TextCenter>
        <Spacer h={32} />
        <KeyLine>
          <KeyPre>{syncKey}</KeyPre>
          <Button onClick={copyKey}>{justCopied ? "Copied" : "Copy"}</Button>
        </KeyLine>
        <Spacer h={64} />
        <CenterColumn w={256}>
          <Button onClick={close}>I've Saved My Key</Button>
        </CenterColumn>
      </Wrap>
    </Modal>
  );
}

const Wrap = styled.div`
  padding: 0 16px;
`;

const KeyLine = styled.div`
  font-size: 16px;
  display: grid;
  grid-template-columns: 1fr 96px;
  gap: 16px;
`;

const KeyPre = styled.div`
  font-family: monospace;
  border: 1px solid var(--bg-dark-gray);
  border-radius: 8px;
  padding: 12px 12px 4px 12px;
  overflow: hidden;
  text-overflow: ellipsis;
`;
