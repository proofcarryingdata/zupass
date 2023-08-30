import { ReactNode, useCallback } from "react";
import styled from "styled-components";
import { useAppError, useDispatch } from "../../src/appHooks";
import { ErrorPopup } from "../modals/ErrorPopup";

// Wrapper for all screens.
export function AppContainer({
  bg,
  children
}: {
  bg: "primary" | "gray";
  children?: ReactNode;
}) {
  const dispatch = useDispatch();
  const error = useAppError();

  const onClose = useCallback(
    () => dispatch({ type: "clear-error" }),
    [dispatch]
  );

  const col = bg === "gray" ? "var(--bg-dark-gray)" : "var(--bg-dark-primary)";
  return (
    <Background color={col}>
      <Container>
        {children}
        {error && <ErrorPopup error={error} onClose={onClose} />}
      </Container>
    </Background>
  );
}

const Background = styled.div<{ color: string }>`
  background-color: ${(p) => p.color};
  width: 100%;
  min-height: 100%;
  min-height: 100vh;
`;

const Container = styled.div`
  display: flex;
  justify-content: flex-start;
  align-items: center;
  flex-direction: column;
  min-height: 100%;
  max-width: 420px;
  margin: 0 auto;
  position: relative;
  padding: 16px;
`;
