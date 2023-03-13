import * as React from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";

export function AppHeader({ inset }: { inset?: 0 | 8 | 16 | 24 }) {
  return (
    <AppHeaderWrap inset={inset || 0}>
      <Link to="/">Passport</Link>
      <Link to="/settings">Settings</Link>
    </AppHeaderWrap>
  );
}

const AppHeaderWrap = styled.div<{ inset: number }>`
  width: 100%;
  padding: 0 ${(p) => p.inset}px;
  display: flex;
  justify-content: space-between;

  a,
  a:visited {
    color: #666;
    text-decoration: none;
  }
`;
