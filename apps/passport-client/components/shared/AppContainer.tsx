import * as React from "react";
import { useCallback } from "react";
import { Outlet, useLocation } from "react-router-dom";
import styled from "styled-components";
import { DispatchContext } from "../../src/dispatch";
import { ErrorPopup } from "./ErrorPopup";

// Wrapper for all screens.
export function AppContainer() {
  const [state, dispatch] = React.useContext(DispatchContext);
  const onClose = useCallback(
    () => dispatch({ type: "clear-error" }),
    [dispatch]
  );

  const loc = useLocation();
  const color = loc.pathname === "/" ? "#2a3231" : "#19473F";

  return (
    <Background color={color}>
      <Container>
        <Outlet />
        {state.error && <ErrorPopup error={state.error} onClose={onClose} />}
      </Container>
    </Background>
  );
}

const Background = styled.div<{ color: string }>`
  background-color: ${(p) => p.color};
  width: 100%;
  height: 100%;
  min-height: 100vh;
`;

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  height: 100%;
  max-width: 400px;
  margin: 0 auto;
  position: relative;
`;
