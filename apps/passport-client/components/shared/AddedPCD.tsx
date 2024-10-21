import styled from "styled-components";
import { BottomModalHeader } from "../../new-components/shared/BottomModal";
import { Button2 } from "../../new-components/shared/Button";

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
      <BottomModalHeader
        title="Added"
        description="Close this window by clicking the button below."
      ></BottomModalHeader>
      <Button2 onClick={onCloseClick}>Close</Button2>
    </AddedPCDContainer>
  );
}

const AddedPCDContainer = styled.div`
  display: flex;
  justify-content: center;
  width: 100%;
  gap: 16px;
  flex-direction: column;
  padding-right: 24px;
  padding-left: 24px;
`;
