import React, { ReactNode, useCallback, useEffect } from "react";
import styled, { createGlobalStyle, css } from "styled-components";
import { useDispatch, useModal } from "../../src/appHooks";
import { AppState } from "../../src/state";
import { assertUnreachable } from "../../src/util";
import { Spacer } from "../core";
import { CircleButton } from "../core/Button";
import { icons } from "../icons";
import { AnotherDeviceChangedPasswordModal } from "./AnotherDeviceChangedPasswordModal";
import { ChangedPasswordModal } from "./ChangedPasswordModal";
import { ConfirmSkipSetupModal } from "./ConfirmSkipSetupModal";
import { FrogCryptoExportPCDsModal } from "./FrogCryptoExportPCDsModal";
import { FrogCryptoUpdateTelegramModal } from "./FrogCryptoUpdateTelegramModal";
import { InfoModal } from "./InfoModal";
import { InvalidUserModal } from "./InvalidUserModal";
import { PrivacyNoticeModal } from "./PrivacyNoticeModal";
import { RequireAddPasswordModal } from "./RequireAddPasswordModal";
import { ResolveSubscriptionErrorModal } from "./ResolveSubscriptionError";
import { SettingsModal } from "./SettingsModal";
import { UpgradeAccountModal } from "./UpgradeAccountModal";

export function MaybeModal({
  fullScreen,
  isProveOrAddScreen
}: {
  fullScreen?: boolean;
  isProveOrAddScreen?: boolean;
}) {
  const dispatch = useDispatch();
  const modal = useModal();

  const close = useCallback(
    () => dispatch({ type: "set-modal", modal: { modalType: "none" } }),
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

  const body = getModalBody(modal, isProveOrAddScreen);

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
  const nonDismissable: AppState["modal"]["modalType"][] = [
    "invalid-participant",
    "changed-password",
    "another-device-changed-password",
    "upgrade-account-modal",
    "require-add-password",
    "confirm-setup-later",
    "privacy-notice"
  ];

  return !nonDismissable.includes(modal.modalType);
}

function getModalBody(modal: AppState["modal"], isProveOrAddScreen: boolean) {
  switch (modal.modalType) {
    case "info":
      return <InfoModal />;
    case "settings":
      return <SettingsModal isProveOrAddScreen={isProveOrAddScreen} />;
    case "invalid-participant":
      return <InvalidUserModal />;
    case "another-device-changed-password":
      return <AnotherDeviceChangedPasswordModal />;
    case "changed-password":
      return <ChangedPasswordModal />;
    case "resolve-subscription-error":
      return <ResolveSubscriptionErrorModal />;
    case "confirm-setup-later":
      return <ConfirmSkipSetupModal onConfirm={modal.onConfirm} />;
    case "upgrade-account-modal":
      return <UpgradeAccountModal />;
    case "require-add-password":
      return <RequireAddPasswordModal />;
    case "privacy-notice":
      return <PrivacyNoticeModal />;
    case "frogcrypto-update-telegram":
      return (
        <FrogCryptoUpdateTelegramModal
          revealed={modal.revealed}
          refreshAll={modal.refreshAll}
        />
      );
    case "frogcrypto-export-pcds":
      return <FrogCryptoExportPCDsModal />;
    case "none":
      return null;
    default:
      assertUnreachable(modal);
  }
}

export function Modal(props: {
  onClose?: () => void;
  children: ReactNode;
  fullScreen?: boolean;
}) {
  const ignore = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);
  return (
    <>
      <NoScroll />
      <ModalBg onClick={props.onClose} $fullScreen={props.fullScreen}>
        <ModalWrap fullScreen={props.fullScreen} onClick={ignore}>
          {props.onClose && (
            <CircleButton diameter={20} padding={16} onClick={props.onClose}>
              <img
                draggable="false"
                src={icons.closeWhite}
                width={20}
                height={20}
              />
            </CircleButton>
          )}
          <Spacer h={32} />
          {props.children}
        </ModalWrap>
      </ModalBg>
    </>
  );
}

const NoScroll = createGlobalStyle`
  html, body {
    overflow: hidden;
    max-height: 100vh;
  }
`;

const ModalBg = styled.div<{ $fullScreen?: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  overflow-y: scroll;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 999;
  padding: ${(props) => (props.$fullScreen ? "0" : "0 12px")};
`;

const ModalWrap = styled.div<{ fullScreen?: boolean }>`
  background: radial-gradient(
    circle,
    var(--bg-lite-primary),
    var(--bg-dark-primary)
  );
  width: 100%;
  max-width: 420px;
  margin: 64px auto;
  min-height: 480px;
  padding: 12px;
  border-radius: 12px;

  ${({ fullScreen }) =>
    fullScreen &&
    css`
      width: 100vw;
      max-width: 100vw;
      height: 100vh;
      margin: 0;
      border-radius: 0;
    `}
`;
