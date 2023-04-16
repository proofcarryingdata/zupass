import React, { ReactNode, useCallback, useContext } from "react";
import styled from "styled-components";
import { DispatchContext } from "../../src/dispatch";
import { ZuState } from "../../src/state";
import { assertUnreachable } from "../../src/util";
import { Spacer } from "../core";
import { CircleButton } from "../core/Button";
import { icons } from "../icons";
import { InfoModal } from "./InfoModal";
import { SaveSyncModal } from "./SaveSyncModal";
import { SettingsModal } from "./SettingsModal";

export function MaybeModal() {
  const [state, dispatch] = useContext(DispatchContext);
  const close = useCallback(
    () => dispatch({ type: "set-modal", modal: "" }),
    [dispatch]
  );
  const body = getModalBody(state.modal);
  if (body == null) return null;
  return <Modal onClose={close}>{body}</Modal>;
}

function getModalBody(modal: ZuState["modal"]) {
  switch (modal) {
    case "info":
      return <InfoModal />;
    case "settings":
      return <SettingsModal />;
    case "save-sync":
      return <SaveSyncModal />;
    case "":
      return null;
    default:
      assertUnreachable(modal);
  }
}

export function Modal(props: { onClose?: () => void; children: ReactNode }) {
  const ignore = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);
  return (
    <ModalBg onClick={props.onClose}>
      <ModalWrap onClick={ignore}>
        {props.onClose && (
          <CircleButton diameter={20} padding={16} onClick={props.onClose}>
            <img src={icons.closeWhite} width={20} height={20} />
          </CircleButton>
        )}
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
  overflow-y: scroll;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 999;
`;

const ModalWrap = styled.div`
  background: radial-gradient(circle, var(--bg-lite-gray), var(--bg-dark-gray));
  width: 100%;
  max-width: 420px;
  margin: 64px auto;
  min-height: 480px;
  padding: 12px;
  border-radius: 12px;
`;
