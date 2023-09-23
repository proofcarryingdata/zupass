import React, { useCallback } from "react";
import styled from "styled-components";
import { useDispatch } from "../../src/appHooks";
import { AppState } from "../../src/state";
import { CircleButton } from "../core/Button";
import { icons } from "../icons";

export const AppHeader = React.memo(AppHeaderImpl);

function AppHeaderImpl({ children }: { children?: React.ReactNode }) {
  const dispatch = useDispatch();

  const setModal = useCallback(
    (modal: AppState["modal"]) =>
      dispatch({
        type: "set-modal",
        modal
      }),
    [dispatch]
  );
  const openInfo = useCallback(() => setModal("info"), [setModal]);
  const openSettings = useCallback(() => setModal("settings"), [setModal]);

  return (
    <AppHeaderWrap>
      <CircleButton diameter={34} padding={8} onClick={openInfo}>
        <img draggable="false" src={icons.infoAccent} width={34} height={34} />
      </CircleButton>
      {children}
      <CircleButton diameter={34} padding={8} onClick={openSettings}>
        <img
          draggable="false"
          src={icons.settingsAccent}
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
