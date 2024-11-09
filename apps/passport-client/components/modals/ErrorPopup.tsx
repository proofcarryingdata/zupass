import { useCallback } from "react";
import styled from "styled-components";
import { AppError } from "../../src/state";
import { Button, H2, PreWrap, Spacer } from "../core";

export function ErrorPopup({
  error,
  onClose
}: {
  error: AppError;
  onClose: () => void;
}): JSX.Element {
  const ignore = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);
  return (
    <ErrorBg onClick={onClose}>
      <ErrorWrap onClick={ignore}>
        <H2>{error.title}</H2>
        <Spacer h={24} />
        <p>{error.message}</p>
        {error.stack && (
          <>
            <Spacer h={24} />
            <PreWrap>{error.stack}</PreWrap>
          </>
        )}
        <Spacer h={24} />
        <Button onClick={onClose}>Close</Button>
      </ErrorWrap>
    </ErrorBg>
  );
}

const ErrorBg = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  overflow-y: scroll;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  padding-top: 64px;
  padding-left: 32px;
  padding-right: 32px;
  padding-bottom: 64px;
  flex-direction: column;
`;

const ErrorWrap = styled.div`
  border-radius: 24px;
  padding: 24px;
  background-color: var(--primary-dark);
  display: inline-block;
  max-width: 400px;
`;
