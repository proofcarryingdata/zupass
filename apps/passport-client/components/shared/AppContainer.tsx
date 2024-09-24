import { ReactNode, useCallback } from "react";
import { Toaster } from "react-hot-toast";
import styled, { createGlobalStyle } from "styled-components";
import {
  useAppError,
  useDispatch,
  useUserShouldAgreeNewPrivacyNotice
} from "../../src/appHooks";
import { ErrorPopup } from "../modals/ErrorPopup";
import { ScreenLoader } from "./ScreenLoader";

// Wrapper for all screens.
export function AppContainer({
  children,
  bg,
  fullscreen
}: {
  bg: "primary" | "gray";
  children?: ReactNode;
  fullscreen?: boolean;
}): JSX.Element {
  const dispatch = useDispatch();
  const error = useAppError();
  useUserShouldAgreeNewPrivacyNotice();

  const onClose = useCallback(
    () => dispatch({ type: "clear-error" }),
    [dispatch]
  );

  const col =
    bg === "gray" ? "var(--dot-pattern-bg)" : "var(--bg-dark-primary)";
  return (
    <Container $fullscreen={!!fullscreen}>
      <GlobalBackground color={col} />
      <Background>
        <CenterColumn>
          {children && (
            <Toaster
              toastOptions={{
                success: {
                  duration: 5000
                },
                error: {
                  duration: 8000
                }
              }}
            />
          )}
          {children ?? <ScreenLoader text="Zupass" />}
          {error && <ErrorPopup error={error} onClose={onClose} />}
        </CenterColumn>
      </Background>
    </Container>
  );
}

export const GlobalBackground = createGlobalStyle<{ color: string }>`
  html {
    background: ${(p): string => p.color};
  }
`;

export const Background = styled.div`
  width: 100%;
  min-height: 100%;
`;

export const CenterColumn = styled.div`
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

const Container = styled.div<{ $fullscreen: boolean }>`
  ${({ $fullscreen }): string =>
    $fullscreen
      ? `
          display: flex;
          height: 100vh;
        `
      : ""}
`;
