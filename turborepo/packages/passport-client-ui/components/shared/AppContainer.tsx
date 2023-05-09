import * as React from "react";
import { ReactNode, useCallback } from "react";
import styled from "styled-components";
import { DispatchContext } from "../../src/dispatch";
import { ErrorPopup } from "../modals/ErrorPopup";

// Wrapper for all screens.
export function AppContainer({
  bg,
  children,
}: {
  bg: "primary" | "gray";
  children?: ReactNode;
}) {
  const [state, dispatch] = React.useContext(DispatchContext);
  const onClose = useCallback(
    () => dispatch({ type: "clear-error" }),
    [dispatch]
  );

  const col = bg === "gray" ? "var(--bg-dark-gray)" : "var(--bg-dark-primary)";
  return (
    <Background color={col}>
      <Container>
        {children}
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
  max-width: 420px;
  margin: 0 auto;
  position: relative;
`;
