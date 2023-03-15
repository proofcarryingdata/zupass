import * as React from "react";
import { useCallback } from "react";
import { Outlet } from "react-router-dom";
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

  return (
    <Container>
      <Outlet />
      {state.error && <ErrorPopup error={state.error} onClose={onClose} />}
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  height: 100%;
  width: 320px;
  margin: 0 auto;
  position: relative;
`;
