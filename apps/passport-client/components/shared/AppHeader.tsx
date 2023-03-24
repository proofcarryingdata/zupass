import * as React from "react";
import { ReactNode, useCallback, useContext, useEffect, useState } from "react";
import styled from "styled-components";
import { DispatchContext } from "../../src/dispatch";
import { CenterColumn, Spacer, TextCenter } from "../core";
import { Button, CircleButton, LinkButton } from "../core/Button";

export function AppHeader() {
  const [modal, setModal] = useState("");
  const openInfo = useCallback(() => setModal("info"), [setModal]);
  const openSettings = useCallback(() => setModal("settings"), [setModal]);
  const close = useCallback(() => setModal(""), [setModal]);

  // Close on escape
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", listener, { capture: true });
    return () => window.removeEventListener("keydown", listener);
  }, [close]);

  return (
    <AppHeaderWrap>
      <CircleButton diameter={34} padding={8} onClick={openInfo}>
        <img src="/assets/info-accent.svg" width={34} height={34} />
      </CircleButton>
      <CircleButton diameter={34} padding={8} onClick={openSettings}>
        <img src="/assets/settings-accent.svg" width={34} height={34} />
      </CircleButton>
      {modal !== "" && (
        <Modal onClose={close}>
          {modal === "info" && <InfoModal />}
          {modal === "settings" && <SettingsModal />}
        </Modal>
      )}
    </AppHeaderWrap>
  );
}

const AppHeaderWrap = styled.div`
  width: 100%;
  padding: 0;
  display: flex;
  justify-content: space-between;
`;

function Modal(props: { onClose: () => void; children: ReactNode }) {
  const ignore = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);
  return (
    <ModalBg onClick={props.onClose}>
      <ModalWrap onClick={ignore}>
        <CircleButton diameter={20} padding={16} onClick={props.onClose}>
          <img src="/assets/close-white.svg" width={20} height={20} />
        </CircleButton>
        <Spacer h={32} />
        {props.children}
      </ModalWrap>
    </ModalBg>
  );
}

const ModalBg = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
`;

const ModalWrap = styled.div`
  background: radial-gradient(circle, var(--bg-lite-gray), var(--bg-dark-gray));
  top: 64px;
  left: 0;
  width: 100%;
  max-width: 400px;
  margin: 64px auto 0 auto;
  min-height: 480px;
  padding: 12px;
  border-radius: 12px;
`;

function InfoModal() {
  return (
    <div>
      <Spacer h={32} />
      <TextCenter>
        <img src="/assets/info-primary.svg" width={34} height={34} />
      </TextCenter>
      <Spacer h={32} />
      <CenterColumn w={240}>
        <TextCenter>
          The Zuzalu Passport is a product of 0xPARC. For app support, contact{" "}
          <a href="mailto:passport@0xparc.org">passport@0xparc.org</a>.
        </TextCenter>
        <Spacer h={16} />
        <TextCenter>
          For event or venue support, contact{" "}
          <a href="invites@zuzalu.org">invites@zuzalu.org</a>.
        </TextCenter>
      </CenterColumn>
    </div>
  );
}

function SettingsModal() {
  const [justCopied, setJustCopied] = useState(false);
  const copySyncKey = useCallback(async () => {
    // Use the window clipboard API to copy the key
    await window.navigator.clipboard.writeText(state.encryptionKey);
    setJustCopied(true);
    setTimeout(() => setJustCopied(false), 2000);
  }, []);

  const [state, dispatch] = useContext(DispatchContext);
  const clearPassport = useCallback(() => {
    if (window.confirm("Are you sure? This will delete your data.")) {
      dispatch({ type: "reset-passport" });
    }
  }, []);

  return (
    <>
      <Spacer h={32} />
      <TextCenter>
        <img src="/assets/settings-primary.svg" width={34} height={34} />
      </TextCenter>
      <Spacer h={32} />
      <CenterColumn w={280}>
        <LinkButton to="/scan">Verify a Passport</LinkButton>
        <Spacer h={16} />
        <Button onClick={copySyncKey}>
          {justCopied ? "Copied" : "Copy Key for Sync"}
        </Button>
        <Spacer h={16} />
        <Button onClick={clearPassport} style="danger">
          Clear Passport
        </Button>
      </CenterColumn>
    </>
  );
}
