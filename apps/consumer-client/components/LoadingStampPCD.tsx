import { PendingStampPCD, StampPCDStatus } from "@pcd/passport-interface";
import { useEffect, useState } from "react";
import styled from "styled-components";
import { PASSPORT_SERVER_URL } from "../src/constants";

export const LoadingStampPCD = ({
  pendingStampPCD,
  setPcdStr,
}: {
  pendingStampPCD: PendingStampPCD | undefined;
  setPcdStr: any;
}) => {
  const [status, setStatus] = useState("");

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined = undefined;

    // TODO: not sure if this is the best way to ping the server repeatedly,
    // or if this leads to weird sitautions where this interval continues to run
    // after people navigate away from the page?
    const getStatus = () => {
      if (pendingStampPCD !== undefined) {
        fetch(`${PASSPORT_SERVER_URL}pcds/status/${pendingStampPCD.hash}`)
          .then((response) => response.json())
          .then((data) => {
            console.log(data);
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
    margin: 10px 0 10px 0;
    border: 1px solid ${statusColor};
    padding: 5px;
    color: ${statusColor};
  `;

  return <StyledDiv>Stamp Status: {status}</StyledDiv>;
};
