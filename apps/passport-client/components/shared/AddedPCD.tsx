import styled from "styled-components";
import { Button, H1 } from "../core";

/**
 * UI that is shown to the user immediately after they added a PCD to
 * their Zupass. PCDs can be added by third party websites via uploading
 * a `SerializedPCD`, or by requesting a new PCD to be proved by Zupass.
 */
export function AddedPCD({
  onCloseClick
}: {
  onCloseClick: () => void;
}): JSX.Element {
  return (
    <AddedPCDContainer>
      <H1>Added</H1>
      <p>Close this window by clicking the button below.</p>
      <Button onClick={onCloseClick}>Close</Button>
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
