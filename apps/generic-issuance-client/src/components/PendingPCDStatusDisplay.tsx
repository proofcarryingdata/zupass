import { PendingPCDStatus } from "@pcd/passport-interface";
import styled from "styled-components";

/**
 * Component that displays the status of a PendingPCD.
 */
export const PendingPCDStatusDisplay = ({
  status,
  pendingPCDError
}: {
  status: PendingPCDStatus;
  pendingPCDError: string;
}): JSX.Element => {
  const StyledDiv = styled.div`
    margin: 10px 0 5px 0;
    border: 1px solid ${statusColor[status]};
    padding: 5px;
    color: ${statusColor[status]};
  `;

  return (
    <>
      <StyledDiv>Pending PCD Status: {status}</StyledDiv>
      {pendingPCDError && <StyledDiv>{pendingPCDError}</StyledDiv>}
    </>
  );
};

const statusColor: Record<PendingPCDStatus, string> = {
  [PendingPCDStatus.ERROR]: "#f44336",
  [PendingPCDStatus.COMPLETE]: "#4caf50",
  [PendingPCDStatus.PROVING]: "#2196f3",
  [PendingPCDStatus.QUEUED]: "#ff9800",
  [PendingPCDStatus.NONE]: "#000000"
};
