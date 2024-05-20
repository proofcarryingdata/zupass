import styled from "styled-components";
import { ScreenLoader } from "./ScreenLoader";

export function SyncingPCDs(): JSX.Element {
  return (
    <SyncingPCDsContainer>
      <div>
        <ScreenLoader text="Syncing Zupass" />
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
  gap: 1rem;
  flex-direction: column;
  padding: 2rem;
`;
