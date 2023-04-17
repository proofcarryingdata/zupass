import styled from "styled-components";
import { Button, H1 } from "../core";

export function AddedPCD() {
  return (
    <AddedPCDContainer>
      <H1>Added</H1>
      <p>Close this window by clicking the button below.</p>
      <Button
        onClick={() => {
          window.close();
        }}
      >
        Close
      </Button>
    </AddedPCDContainer>
  );
}

const AddedPCDContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  gap: 16px;
  flex-direction: column;
`;
