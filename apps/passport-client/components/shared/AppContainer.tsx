import { ReactNode, useCallback } from "react";
import { Toaster } from "react-hot-toast";
import styled, { createGlobalStyle } from "styled-components";
import {
  useAppError,
  useDispatch,
  useIOSOrientationFix,
  useUserShouldAgreeNewPrivacyNotice
} from "../../src/appHooks";
import { MAX_WIDTH_SCREEN } from "../../src/sharedConstants";
import { ErrorPopup } from "../modals/ErrorPopup";
import { ScreenLoader } from "./ScreenLoader";

// Wrapper for all screens.
export function AppContainer({
  children,
  bg,
  fullscreen,
  noPadding
}: {
  bg: "primary" | "gray" | "white";
  children?: ReactNode;
  fullscreen?: boolean;
  noPadding?: boolean;
}): JSX.Element {
  const dispatch = useDispatch();
  const error = useAppError();
  useUserShouldAgreeNewPrivacyNotice();
  useIOSOrientationFix();

  const onClose = useCallback(
    () => dispatch({ type: "clear-error" }),
    [dispatch]
  );
  const getBackground = (): string => {
    switch (bg) {
      case "primary":
        return "var(--bg-dark-primary)";
      case "gray":
        return "var(--dot-pattern-bg)";
      case "white":
        return "#fff";
    }
  };
  const col = getBackground();
  return (
    <Container $fullscreen={!!fullscreen}>
      <GlobalBackground color={col} />
      <Background>
        <CenterColumn defaultPadding={!noPadding}>
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
          {/* When phase3 please remove ErrorPopup with ErrorBottomModal */}
          {error && <ErrorPopup error={error} onClose={onClose} />}
          {/* {error && <ErrorBottomModal error={error} onClose={onClose} />} */}
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

export const CenterColumn = styled.div<{ defaultPadding: boolean }>`
  display: flex;
  justify-content: flex-start;
  align-items: center;
  flex-direction: column;
  min-height: 100%;
  max-width: ${MAX_WIDTH_SCREEN}px;
  margin: 0 auto;
  position: relative;
  ${({ defaultPadding }): string => (defaultPadding ? "padding: 16px;" : "")}
`;

const Container = styled.div<{ $fullscreen: boolean }>`
  ${({ $fullscreen }): string =>
    $fullscreen
      ? `
          display: flex;
          height: 100vh;

          @supports (height: 100dvh) {
            height: 100dvh;
          }
        `
      : ""}
`;
