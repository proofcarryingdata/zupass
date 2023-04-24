import styled from "styled-components";
import { RippleLoader } from "../core/RippleLoader";

export function DownloadingPCDs() {
  return (
    <DownloadingPCDsContainer>
      <RippleLoader />
    </DownloadingPCDsContainer>
  );
}

const DownloadingPCDsContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  gap: 16px;
  flex-direction: column;
`;
