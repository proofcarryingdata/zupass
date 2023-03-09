import * as React from "react";

import { passportReceiveRequest } from "passport-interface";
import { useEffect } from "react";
import styled from "styled-components";

export default function Receive() {
  const request = useEffect(() => {
    const req = passportReceiveRequest(window?.location?.href);
    console.log("Received passport request", req);
  }, []);

  return (
    <Container>
      <h1>PASSPORT</h1>
      <div>This page receives PCD add or get requests</div>
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  height: 100%;

  button {
    padding: 16px 64px;
    font-size: 3em;
    cursor: pointer;
  }
`;
