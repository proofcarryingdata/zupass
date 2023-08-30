import React, { ReactNode, useCallback, useEffect } from "react";
import styled, { css } from "styled-components";
import { useDispatch, useModal } from "../../src/appHooks";
import { AppState } from "../../src/state";
import { assertUnreachable } from "../../src/util";
import { Spacer } from "../core";
import { CircleButton } from "../core/Button";
import { icons } from "../icons";
import { InfoModal } from "./InfoModal";
import { InvalidUserModal } from "./InvalidUserModal";
import { SaveSyncModal } from "./SaveSyncModal";
import { SettingsModal } from "./SettingsModal";

export function MaybeModal({ fullScreen }: { fullScreen?: boolean }) {
  const dispatch = useDispatch();
  const modal = useModal();

  const close = useCallback(
    () => dispatch({ type: "set-modal", modal: "" }),
    [dispatch]
  );
  const dismissable = isModalDismissable(modal);

  // Close on escape
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dismissable) {
        close();
      }
    };
    window.addEventListener("keydown", listener, { capture: true });
    return () =>
      window.removeEventListener("keydown", listener, { capture: true });
  }, [close, dismissable]);

  const body = getModalBody(modal);

  if (body == null) return null;

  return (
    <Modal
      fullScreen={fullScreen}
      onClose={dismissable === true ? close : undefined}
    >
      {body}
    </Modal>
  );
}

function isModalDismissable(modal: AppState["modal"]) {
  return !["save-sync", "invalid-participant"].includes(modal);
}

function getModalBody(modal: AppState["modal"]) {
  switch (modal) {
    case "info":
      return <InfoModal />;
    case "settings":
      return <SettingsModal />;
    case "save-sync":
      return <SaveSyncModal />;
    case "invalid-participant":
      return <InvalidUserModal />;
    case "":
      return null;
    default:
      assertUnreachable(modal);
  }
}

export function Modal({
  onClose,
  children,
  fullScreen
}: {
  onClose?: () => void;
  children: ReactNode;
  fullScreen?: boolean;
}) {
  const ignore = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);
  return (
    <ModalBg onClick={onClose}>
      <ModalWrap fullScreen={fullScreen} onClick={ignore}>
        {onClose && (
          <CircleButton diameter={20} padding={16} onClick={onClose}>
            <img src={icons.closeWhite} width={20} height={20} />
          </CircleButton>
        )}
        <Spacer h={32} />
        {children}
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
  overflow-y: scroll;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 999;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  flex-direction: column;
`;

const ModalWrap = styled.div<{ fullScreen?: boolean }>`
  background: radial-gradient(circle, var(--bg-lite-gray), var(--bg-dark-gray));
  margin: 32px 32px;
  width: 400px;
  box-sizing: border-box;
  min-height: 480px;
  padding: 12px;
  border-radius: 12px;

  ${({ fullScreen }) => {
    // alert(fullScreen);
    return fullScreen
      ? css`
          width: 100vw;
          max-width: 100vw;
          height: 100vh;
          margin: 0;
          border-radius: 0;
        `
      : css``;
  }}
`;
