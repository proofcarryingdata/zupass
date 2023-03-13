import * as React from "react";
import styled from "styled-components";
import { Button, H1, Spacer } from "../core";

interface Error {
  title: string;
  message: string;
}

export function ErrorPopup({
  error,
  onClose,
}: {
  error: Error;
  onClose: () => void;
}) {
  return (
    <ErrorWrap>
      <Spacer h={24} />
      <H1>❌ &nbsp; {error.title}</H1>
      <Spacer h={24} />
      <p>{error.message}</p>
      <Spacer h={24} />
      <Button style="secondary" onClick={onClose}>
        Close
      </Button>
    </ErrorWrap>
  );
}

const ErrorWrap = styled.div`
  position: absolute;
  top: 24px;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 24px;
  padding: 24px;
  background-color: #fee;
`;
