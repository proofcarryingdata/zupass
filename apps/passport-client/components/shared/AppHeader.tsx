import { CircleButton } from "@pcd/passport-ui";
import React, { useCallback } from "react";
import { IoMdSettings } from "react-icons/io";
import { MdInfo, MdOutlineQrCodeScanner, MdRssFeed } from "react-icons/md";
import styled from "styled-components";
import { useDispatch, useSelf, useSubscriptions } from "../../src/appHooks";
import { AppState } from "../../src/state";

export const AppHeader = React.memo(AppHeaderImpl);

function AppHeaderImpl({
  children,
  isEdgeCity = false,
  isProveOrAddScreen = false
}: {
  children?: React.ReactNode;
  isEdgeCity?: boolean;
  isProveOrAddScreen?: boolean;
}): JSX.Element {
  const dispatch = useDispatch();
  const self = useSelf();

  const setModal = useCallback(
    (modal: AppState["bottomModal"]) =>
      dispatch({
        type: "set-bottom-modal",
        modal
      }),
    [dispatch]
  );
  const openInfo = useCallback(
    () => setModal({ modalType: "about", modalGoBackBehavior: "close" }),
    [setModal]
  );
  const openSettings = useCallback(
    () => setModal({ modalType: "settings" }),
    [setModal]
  );
  const openScanner = useCallback(() => (window.location.href = "/#/scan"), []);

  const openSubscriptions = useCallback(
    () => (window.location.href = "/#/subscriptions"),
    []
  );
  const subscriptions = useSubscriptions();

  if (!self) {
    return <AppHeaderWrap>{children}</AppHeaderWrap>;
  }

  return (
    <AppHeaderWrap>
      <CircleButton diameter={34} padding={8} onClick={openInfo}>
        <MdInfo
          size={34}
          color={
            isProveOrAddScreen
              ? "var(--text-primary)"
              : isEdgeCity
              ? "white"
              : "var(--accent-lite)"
          }
        />
      </CircleButton>
      {children}
      {!isProveOrAddScreen && (
        <>
          <CircleButton diameter={34} padding={8} onClick={openSubscriptions}>
            {subscriptions.value.getAllErrors().size > 0 && (
              <ErrorDotContainer>
                <ErrorDot />
              </ErrorDotContainer>
            )}
            <MdRssFeed
              size={34}
              color={isEdgeCity ? "white" : "var(--accent-lite)"}
            />
          </CircleButton>
          <CircleButton diameter={34} padding={8} onClick={openScanner}>
            <MdOutlineQrCodeScanner
              size={34}
              color={isEdgeCity ? "white" : "var(--accent-lite)"}
            />
          </CircleButton>
        </>
      )}

      <CircleButton diameter={34} padding={8} onClick={openSettings}>
        <IoMdSettings
          size={34}
          color={
            isProveOrAddScreen
              ? "var(--text-primary)"
              : isEdgeCity
              ? "white"
              : "var(--accent-lite)"
          }
        />
      </CircleButton>
    </AppHeaderWrap>
  );
}

const AppHeaderWrap = styled.div`
  width: 100%;
  padding: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
`;

const ErrorDot = styled.div`
  position: absolute;
  background: var(--danger);
  right: 0px;
  width: 8px;
  height: 8px;
  border-radius: 8px;
`;

const ErrorDotContainer = styled.div`
  position: relative;
  pointer-events: none;
`;
