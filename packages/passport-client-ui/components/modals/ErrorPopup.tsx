import * as React from "react";
import styled from "styled-components";
import { ZuError } from "../../src/state";
import { Button, H1, PreWrap, Spacer } from "../core";

export function ErrorPopup({
  error,
  onClose,
}: {
  error: ZuError;
  onClose: () => void;
}) {
  return (
    <ErrorWrap>
      <Spacer h={24} />
      <H1>{error.title}</H1>
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
  );
}

const ErrorWrap = styled.div`
  position: absolute;
  top: 24px;
  left: 0;
  right: 0;
  border-radius: 24px;
  padding: 24px;
  background-color: var(--primary-dark);
`;
