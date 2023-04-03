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
 * PendingPCDLoader
 * ----------------
 * Component that pings the Passport Server for the status of a specific ProveRequest,
 * inputting a stringified PendingPCD object. Can be imported into any page that
 * is okay with accepting server-side proofs.
 */
export const PendingPCDLoader = ({
  pendingPCDStr,
}: {
  pendingPCDStr: string;
}) => {
  const [status, setStatus] = useState<PendingPCDStatus>(PendingPCDStatus.NONE);

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined = undefined;

    // TODO: not sure if this is the best way to ping the server repeatedly,
    // or if this leads to weird situations where this interval continues to run
    // after people navigate away from the page?
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
          .catch((error) => console.error(error));
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

  return <StyledDiv>Pending PCD Status: {status}</StyledDiv>;
};

const statusColor: Record<PendingPCDStatus, string> = {
  [PendingPCDStatus.ERROR]: "#f44336",
  [PendingPCDStatus.COMPLETE]: "#4caf50",
  [PendingPCDStatus.PROVING]: "#2196f3",
  [PendingPCDStatus.QUEUED]: "#ff9800",
  [PendingPCDStatus.NONE]: "#000000",
};
