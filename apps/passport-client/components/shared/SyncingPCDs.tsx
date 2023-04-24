import styled from "styled-components";
import { RippleLoader } from "../core/RippleLoader";

export function SyncingPCDs() {
  return (
    <SyncingPCDsContainer>
      <div>
        <RippleLoader />
      </div>
    </SyncingPCDsContainer>
  );
}

const SyncingPCDsContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  gap: 16px;
  flex-direction: column;
`;
