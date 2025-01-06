import { CircleButton } from "@pcd/passport-ui";
import { assertUnreachable } from "@pcd/util";
import React, { ReactNode, useCallback, useEffect } from "react";
import { GrClose } from "react-icons/gr";
import styled, { FlattenSimpleInterpolation, css } from "styled-components";
import { useDispatch, useModal } from "../../src/appHooks";
import { AppState } from "../../src/state";
import { Spacer } from "../core";
import { Overscroll } from "../shared/Overscroll";
import { AnotherDeviceChangedPasswordModal } from "./AnotherDeviceChangedPasswordModal";
import { ChangedPasswordModal } from "./ChangedPasswordModal";
import { FrogCryptoExportPCDsModal } from "./FrogCryptoExportPCDsModal";
import { FrogCryptoUpdateTelegramModal } from "./FrogCryptoUpdateTelegramModal";
import { InfoModal } from "./InfoModal";
import { InvalidUserModal } from "./InvalidUserModal";
import { PrivacyNoticeModal } from "./PrivacyNoticeModal";
import { ResolveSubscriptionErrorModal } from "./ResolveSubscriptionError";
import { SettingsModal } from "./SettingsModal";

export function MaybeModal({
  fullScreen,
  isProveOrAddScreen
}: {
  fullScreen?: boolean;
  isProveOrAddScreen?: boolean;
}): JSX.Element {
  const dispatch = useDispatch();
  const modal = useModal();

  const close = useCallback(
    () => dispatch({ type: "set-modal", modal: { modalType: "none" } }),
    [dispatch]
  );
  const dismissable = isModalDismissable(modal);

  // Close on escape
  useEffect(() => {
    const listener = (e: KeyboardEvent): void => {
      if (e.key === "Escape" && dismissable) {
        close();
      }
    };
    window.addEventListener("keydown", listener, { capture: true });
    return () =>
      window.removeEventListener("keydown", listener, { capture: true });
  }, [close, dismissable]);

  const body = getModalBody(modal, !!isProveOrAddScreen);

  if (!body)
    return (
      <>
        <Overscroll />
      </>
    );

  return (
    <>
      <Overscroll />
      <Modal
        fullScreen={fullScreen}
        onClose={dismissable === true ? close : undefined}
      >
        {body}
      </Modal>
    </>
  );
}

function isModalDismissable(modal: AppState["modal"]): boolean {
  const nonDismissable: AppState["modal"]["modalType"][] = [
    "invalid-participant",
    "changed-password",
    "another-device-changed-password",
    "privacy-notice"
  ];

  return !nonDismissable.includes(modal.modalType);
}

function getModalBody(
  modal: AppState["modal"],
  isProveOrAddScreen: boolean
): JSX.Element | null {
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
}): JSX.Element {
  const ignore = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);

  useEffect(() => {
    document.body.style.overflowY = "hidden";
    document.body.style.paddingRight = "15px";
    return () => {
      document.body.style.overflowY = "scroll";
      document.body.style.paddingRight = "0px";
    };
  }, [props.fullScreen]);

  return (
    <ModalBg onClick={props.onClose} $fullScreen={props.fullScreen}>
      <ModalWrap fullScreen={props.fullScreen} onClick={ignore}>
        {props.onClose && (
          <CircleButton diameter={20} padding={16} onClick={props.onClose}>
            <GrClose style={{ height: "20px", width: "20px", color: "#fff" }} />
          </CircleButton>
        )}
        <Spacer h={16} />
        {props.children}
      </ModalWrap>
    </ModalBg>
  );
}

const ModalBg = styled.div<{ $fullScreen?: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  overflow-x: hidden;
  overflow-y: hidden;
  background: rgba(0, 0, 0, 0.5);
  z-index: 9999;

  ${({ $fullScreen }: { $fullScreen?: boolean }): FlattenSimpleInterpolation =>
    $fullScreen
      ? css``
      : css`
          padding: 16px 32px;
        `}
`;

const ModalWrap = styled.div<{ fullScreen?: boolean }>`
  background: radial-gradient(
    circle,
    var(--bg-lite-primary),
    var(--bg-dark-primary)
  );
  width: 100%;
  max-width: 420px;
  margin: 8px auto;
  min-height: 480px;
  padding: ${(props): string => (props.fullScreen ? "0" : "12px")};
  border-radius: 12px;

  ${({ fullScreen }): FlattenSimpleInterpolation =>
    fullScreen
      ? css`
          width: 100vw;
          max-width: 100vw;
          height: 100vh;
          margin: 0;
          border-radius: 0;
        `
      : css``}
`;
