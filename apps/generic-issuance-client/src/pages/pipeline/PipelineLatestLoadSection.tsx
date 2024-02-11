import { Table, Td, Th, Tr } from "@chakra-ui/react";
import { PipelineLoadSummary } from "@pcd/passport-interface";
import { ReactNode } from "react";
import { pipelineStatusIcon } from "../../components/PipelineDisplayUtils";
import { timeAgo } from "../../helpers/util";

/**
 * Renders information about the last time this pipeline was run by Podbox.
 * Useful for debugging an integration, and figuring out what went wrong.
 */
export function PipelineLatestLoadSection({
  lastLoad
}: {
  lastLoad?: PipelineLoadSummary;
}): ReactNode {
  if (!lastLoad) {
    return null;
  }

  const startDate = new Date(lastLoad.lastRunStartTimestamp);
  const endDate = new Date(lastLoad.lastRunEndTimestamp);

  return (
    <Table size="sm" variant="simple">
      <thead>
        <Tr>
          <Th>started</Th>
          <Th>ended</Th>
          <Th>duration</Th>
          <Th>atoms loaded</Th>
          <Th>success</Th>
        </Tr>
      </thead>
      <tbody>
        <Tr>
          <Td>{timeAgo.format(startDate, "twitter")} ago</Td>
          <Td>{timeAgo.format(endDate, "twitter")} ago </Td>
          <Td>{endDate.getTime() - startDate.getTime()}ms</Td>
          <Td>{lastLoad.atomsLoaded}</Td>
          <Td>
            {pipelineStatusIcon(lastLoad)} {lastLoad.success.toString()}
          </Td>
        </Tr>
      </tbody>
    </Table>
  );
}
