import { PendingStampPCD, StampPCDStatus } from "@pcd/passport-interface";
import { useEffect, useState } from "react";
import styled from "styled-components";
import { PASSPORT_SERVER_URL } from "../src/constants";

const LoadingStampPCD = ({
  pendingStampPCD,
  setPcdStr,
}: {
  pendingStampPCD: PendingStampPCD | undefined;
  setPcdStr: any;
}) => {
  const [status, setStatus] = useState("");

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined = undefined;

    const getStatus = () => {
      if (pendingStampPCD !== undefined) {
        fetch(`${PASSPORT_SERVER_URL}/pcds/status/${pendingStampPCD.hash}`)
          .then((response) => response.json())
          .then((data) => {
            setStatus(data.status);
            if (data.status === StampPCDStatus.COMPLETE) {
              setPcdStr(data.proof);
              clearInterval(interval);
            }
          })
          .catch((error) => console.error(error));
      }
    };

    interval = setInterval(getStatus, 5000);

    return () => clearInterval(interval);
  }, [pendingStampPCD, setPcdStr]);

  let statusColor = "#000";
  switch (status) {
    case StampPCDStatus.IN_QUEUE:
      statusColor = "#ff9800";
      break;
    case StampPCDStatus.PROVING:
      statusColor = "#2196f3";
      break;
    case StampPCDStatus.COMPLETE:
      statusColor = "#4caf50";
      break;
    case StampPCDStatus.ERROR:
      statusColor = "#f44336";
      break;
    default:
      break;
  }

  const StyledDiv = styled.div`
    margin: 10px;
    border: 1px solid ${statusColor};
    padding: 5px;
    color: ${statusColor};
  `;

  return <StyledDiv>Status: {status}</StyledDiv>;
};

export default LoadingStampPCD;
