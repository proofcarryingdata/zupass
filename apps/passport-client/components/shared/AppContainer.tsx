import { ReactNode, useCallback, useMemo } from "react";
import { useLocation } from "react-router-dom";
import styled, { createGlobalStyle } from "styled-components";
import { useAppError, useDispatch } from "../../src/appHooks";
import { ErrorPopup } from "../modals/ErrorPopup";
import { appConfig } from "../../src/appConfig";

// Wrapper for all screens.
export function AppContainer({
  children,
  overrideBackgroundColor
}: {
  children?: ReactNode;
  /**
   * Override route based background color
   *
   * Caution: use this sparingly because it will lead to a flash of default background color when loading route directly from url.
   */
  overrideBackgroundColor?: "primary" | "gray";
}) {
  const dispatch = useDispatch();
  const error = useAppError();
  const { hash } = useLocation();

  const onClose = useCallback(
    () => dispatch({ type: "clear-error" }),
    [dispatch]
  );

  /**
   * We need to set the background color of the app based on the current route.
   * See index.hbs for more detailed explaination why we use a centralized config.
   *
   * HashRouter stores path in document.location as /#/<path>?<query> where hash = #/<path>
   * so we need to slice the first two characters to get the actual path.
   *
   * NB: hash is always a string, even if it's empty.
   */
  const col = useMemo(() => {
    if (overrideBackgroundColor) {
      return overrideBackgroundColor === "gray"
        ? "var(--bg-dark-gray)"
        : "var(--bg-dark-primary)";
    }

    return appConfig.grayBackgroundRoutes.includes(hash.slice(2))
      ? "var(--bg-dark-gray)"
      : "var(--bg-dark-primary)";
  }, [hash, overrideBackgroundColor]);

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
