import React from "react";
import styled from "styled-components";
import { useIsOffline } from "../../src/appHooks";

export function IndicateIfOffline({
  children
}: {
  children?: React.ReactNode | React.ReactNode[];
}) {
  const isOffline = useIsOffline();
  if (!isOffline) {
    return undefined;
  }

  return <Container>{children}</Container>;
}

const Container = styled.div`
  width: 100%;
  border-radius: 12px;
  padding: 16px;
  background-color: white;
  border: 1px solid var(--danger);
  color: black;
  margin-bottom: 16px;
`;
