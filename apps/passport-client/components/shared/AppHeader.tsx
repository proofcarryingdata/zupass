import { useCallback } from "react";
import styled from "styled-components";
import { useDispatch } from "../../src/appHooks";
import { AppState } from "../../src/state";
import { CircleButton } from "../core/Button";
import { icons } from "../icons";

export function AppHeader() {
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
        <img src={icons.infoAccent} width={34} height={34} />
      </CircleButton>
      <CircleButton diameter={34} padding={8} onClick={openSettings}>
        <img src={icons.settingsAccent} width={34} height={34} />
      </CircleButton>
    </AppHeaderWrap>
  );
}

const AppHeaderWrap = styled.div`
  width: 100%;
  padding: 0;
  display: flex;
  justify-content: space-between;
`;
