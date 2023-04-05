import {
  PendingPCD,
  PendingPCDStatus,
  StatusRequest,
  StatusResponse,
} from "@pcd/passport-interface";
import { useEffect, useState } from "react";
import styled from "styled-components";
import { PASSPORT_SERVER_URL } from "../src/constants";

/**
 * Component that pings the Passport Server for the status of a specific ProveRequest,
 * inputting a stringified PendingPCD object. Its logic be imported into any page that
 * would like to accept server-side proofs.
 */
export const PendingPCDLoader = ({
  pendingPCDStr,
}: {
  pendingPCDStr: string;
}) => {
  const [status, setStatus] = useState<PendingPCDStatus>(PendingPCDStatus.NONE);
  const [error, setError] = useState("");

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined = undefined;

    const getStatus = () => {
      if (pendingPCDStr !== undefined && pendingPCDStr !== "") {
        const pendingPCD: PendingPCD = JSON.parse(pendingPCDStr);

        const request: StatusRequest = {
          hash: pendingPCD.hash,
        };

        fetch(`${PASSPORT_SERVER_URL}pcds/status`, {
          method: "POST",
          body: JSON.stringify(request),
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        })
          .then((response) => response.json())
          .then((data: StatusResponse) => {
            console.log(data);
            setStatus(data.status);
            if (data.status === PendingPCDStatus.COMPLETE) {
              window.postMessage({ encodedPCD: data.serializedPCD }, "*");
              clearInterval(interval);
            }
          })
          .catch((error) => {
            setStatus(PendingPCDStatus.ERROR);
            setError(error.toString());
            console.error(error);
          });
      }
    };

    interval = setInterval(getStatus, 1000);

    return () => clearInterval(interval);
  }, [pendingPCDStr]);

  const StyledDiv = styled.div`
    margin: 10px 0 10px 0;
    border: 1px solid ${statusColor[status]};
    padding: 5px;
    color: ${statusColor[status]};
  `;

  return (
    <StyledDiv>
      Pending PCD Status: {status}
      {status === PendingPCDStatus.ERROR && error !== "" && <div>{error}</div>}
    </StyledDiv>
  );
};

const statusColor: Record<PendingPCDStatus, string> = {
  [PendingPCDStatus.ERROR]: "#f44336",
  [PendingPCDStatus.COMPLETE]: "#4caf50",
  [PendingPCDStatus.PROVING]: "#2196f3",
  [PendingPCDStatus.QUEUED]: "#ff9800",
  [PendingPCDStatus.NONE]: "#000000",
};
