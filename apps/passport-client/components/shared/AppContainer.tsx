import { ReactNode, useCallback } from "react";
import styled, { createGlobalStyle } from "styled-components";
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
    <>
      <GlobalBackground color={col} />
      <Background>
        <Container>
          {children}
          {error && <ErrorPopup error={error} onClose={onClose} />}
        </Container>
      </Background>
    </>
  );
}

const GlobalBackground = createGlobalStyle<{ color: string }>`
  html {
    background-color: ${(p) => p.color};
  }
`;

const Background = styled.div`
  width: 100%;
  min-height: 100%;
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
