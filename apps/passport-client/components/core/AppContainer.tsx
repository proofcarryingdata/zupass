import * as React from "react";
import { Outlet } from "react-router-dom";
import styled from "styled-components";

export function AppContainer() {
  return (
    <Container>
      <Outlet />
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  height: 100%;
  width: 320px;
  margin: 0 auto;
  position: relative;
`;
