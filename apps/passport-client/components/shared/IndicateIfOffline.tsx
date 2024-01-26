import React from "react";
import styled from "styled-components";
import { useIsOffline } from "../../src/appHooks";

export function IndicateIfOffline({
  children,
  marginBottom
}: {
  children?: React.ReactNode | React.ReactNode[];
  marginBottom?: string;
}): JSX.Element | undefined {
  const isOffline = useIsOffline();
  if (!isOffline) {
    return undefined;
  }

  return <Container style={{ marginBottom }}>{children}</Container>;
}

const Container = styled.div`
  width: 100%;
  border-radius: 12px;
  padding: 16px;
  background-color: white;
  border: 1px solid var(--danger);
  color: black;
`;
