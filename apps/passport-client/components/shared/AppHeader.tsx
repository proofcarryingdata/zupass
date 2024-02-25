import { icons } from "@pcd/passport-ui";
import React, { useCallback } from "react";
import styled from "styled-components";
import { useDispatch, useSubscriptions } from "../../src/appHooks";
import { AppState } from "../../src/state";
import { CircleButton } from "../core/Button";

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

  const setModal = useCallback(
    (modal: AppState["modal"]) =>
      dispatch({
        type: "set-modal",
        modal
      }),
    [dispatch]
  );
  const openInfo = useCallback(
    () => setModal({ modalType: "info" }),
    [setModal]
  );
  const openSettings = useCallback(
    () => setModal({ modalType: "settings" }),
    [setModal]
  );
  const openSubscriptions = useCallback(
    () => (window.location.href = "/#/subscriptions"),
    []
  );
  const subscriptions = useSubscriptions();

  return (
    <AppHeaderWrap>
      <CircleButton diameter={34} padding={8} onClick={openInfo}>
        <img
          draggable="false"
          src={isEdgeCity ? icons.infoWhite : icons.infoAccent}
          width={34}
          height={34}
        />
      </CircleButton>
      {children}
      {!isProveOrAddScreen && (
        <CircleButton diameter={34} padding={8} onClick={openSubscriptions}>
          {subscriptions.value.getAllErrors().size > 0 && (
            <ErrorDotContainer>
              <ErrorDot />
            </ErrorDotContainer>
          )}
          <img
            title="Subscriptions"
            draggable="false"
            src={isEdgeCity ? icons.subscriptionWhite : icons.subscription}
            width={34}
            height={34}
          />
        </CircleButton>
      )}
      <CircleButton diameter={34} padding={8} onClick={openSettings}>
        <img
          draggable="false"
          src={isEdgeCity ? icons.settingsWhite : icons.settingsAccent}
          width={34}
          height={34}
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
