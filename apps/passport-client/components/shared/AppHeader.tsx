import React, { useCallback } from "react";
import { FaCog, FaInfoCircle } from "react-icons/fa";
import styled from "styled-components";
import { useDispatch, useSelf, useSubscriptions } from "../../src/appHooks";
import { AppState } from "../../src/state";
import { cn } from "../../src/util";
import { NewButton } from "../NewButton";

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
      {children}
      {!isProveOrAddScreen && (
        <>
          {/* <CircleButton diameter={34} padding={8} onClick={openSubscriptions}>
            {subscriptions.value.getAllErrors().size > 0 && (
              <ErrorDotContainer>
                <ErrorDot />
              </ErrorDotContainer>
            )}
            <MdRssFeed
              size={34}
              color={isEdgeCity ? "white" : "var(--accent-lite)"}
            />
          </CircleButton> */}
          {/* <CircleButton diameter={34} padding={8} onClick={openScanner}>
            <MdOutlineQrCodeScanner
              size={34}
              color={isEdgeCity ? "white" : "var(--accent-lite)"}
            />
          </CircleButton> */}
        </>
      )}
      <div className="flex flex-row gap-2 w-full">
        <NewButton
          className={cn(
            "flex flex-row justify-center items-center flex-grow text-center flex-shrink"
          )}
          onClick={openInfo}
        >
          <FaInfoCircle size={24} />
        </NewButton>
        <NewButton
          className="flex-grow"
          onClick={() => {
            window.location.href = "#/more";
          }}
        >
          ZAPPS
        </NewButton>
        <NewButton
          className={cn(
            "flex flex-row justify-center items-center flex-grow text-center flex-shrink"
          )}
          onClick={openSettings}
        >
          <FaCog size={24} />
        </NewButton>
      </div>
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
  margin-bottom: 0.75rem;
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
