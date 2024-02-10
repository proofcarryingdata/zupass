import { PipelineLoadSummary, PipelineLog } from "@pcd/passport-interface";
import moment from "moment";
import { ReactNode } from "react";
import styled from "styled-components";
import { Table } from "../components/Core";
import { pipelineIcon } from "../components/PipelineDetails";
import { timeAgo } from "../helpers/util";

/**
 * Renders information about the last time this pipeline was run by Podbox.
 * Useful for debugging an integration, and figuring out what went wrong.
 */
export function LoadSummarySection({
  latestRun
}: {
  latestRun: PipelineLoadSummary;
}): ReactNode {
  const startDate = new Date(latestRun.lastRunStartTimestamp);
  const endDate = new Date(latestRun.lastRunEndTimestamp);

  return (
    <div>
      <h4>Last Load</h4>
      <Table>
        <thead>
          <tr>
            <th>started</th>
            <th>ended</th>
            <th>duration</th>
            <th>atoms loaded</th>
            <th>success</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{timeAgo.format(startDate, "twitter")} ago</td>
            <td>{timeAgo.format(endDate, "twitter")} ago </td>
            <td>{endDate.getTime() - startDate.getTime()}ms</td>
            <td>{latestRun.atomsLoaded}</td>
            <td>
              {pipelineIcon(latestRun)} {latestRun.success.toString()}
            </td>
          </tr>
        </tbody>
      </Table>

      <h4>Logs</h4>
      {latestRun.latestLogs.length === 0 ? (
        <>
          <div>no logs</div>
        </>
      ) : (
        <Logs>
          {latestRun.latestLogs.map((l, i) => (
            <PipelineLogEntry log={l} key={i} />
          ))}
        </Logs>
      )}
    </div>
  );
}

export function PipelineLogEntry({ log }: { log: PipelineLog }): ReactNode {
  return (
    <LogRow>
      <LogDate>
        {moment(log.timestampCreated).format("MMMM Do YYYY, h:mm:ss a")} [
        {log.level}]
      </LogDate>
      <Log>{log.value}</Log>
    </LogRow>
  );
}

const Logs = styled.div`
  max-width: 800px;
  padding: 8px;
`;

const LogColumn = styled.span`
  display: inline;
  padding: 4px 8px;
`;

const LogDate = styled(LogColumn)`
  background-color: rgba(255, 255, 255, 0.2);
`;

const Log = styled(LogColumn)``;

const LogRow = styled.div`
  border: 3px solid rgba(255, 255, 255, 0.2);
  margin-top: 4px;
  word-break: break-all;
  font-family: monospace;
`;
