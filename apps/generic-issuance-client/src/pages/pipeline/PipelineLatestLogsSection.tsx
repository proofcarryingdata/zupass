import {
  Table,
  TableContainer,
  Tbody,
  Td,
  Th,
  Thead,
  Tr
} from "@chakra-ui/react";
import { PipelineLoadSummary, PipelineLog } from "@pcd/passport-interface";
import moment from "moment";
import { ReactNode } from "react";
import styled from "styled-components";

/**
 * Renders information about the last time this pipeline was run by Podbox.
 * Useful for debugging an integration, and figuring out what went wrong.
 */
export function PipelineLatestLogsSection({
  lastLoad
}: {
  lastLoad?: PipelineLoadSummary;
}): ReactNode {
  if (!lastLoad) {
    return null;
  }

  return (
    <div
      style={{
        display: "inline-flex",
        // overflowX: "scroll",
        width: "100%"
      }}
    >
      <TableContainer maxW="100%" width="100%">
        <Table variant="simple">
          <Thead style={{ userSelect: "none" }}>
            <Tr>
              <Th style={{ width: "1%" }}>Timestamp</Th>
              <Th style={{ width: "1%" }}>Type</Th>
              <Th style={{ width: "auto" }}>Log</Th>
            </Tr>
          </Thead>
          <Tbody>
            {lastLoad.latestLogs.map((l, i) => (
              <PipelineLogEntry log={l} key={i} />
            ))}
          </Tbody>
        </Table>
      </TableContainer>
    </div>
  );
}

export function PipelineLogEntry({ log }: { log: PipelineLog }): ReactNode {
  return (
    <Trow>
      <Td>{moment(log.timestampCreated).format("MMMM Do YYYY, h:mm:ss a")}</Td>
      <Td>{log.level}</Td>
      <Td>{log.value}</Td>
    </Trow>
  );
}

const Trow = styled.tr``;
