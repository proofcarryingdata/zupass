import { PipelineLoadSummary, PipelineLog } from "@pcd/passport-interface";
import moment from "moment";
import { ReactNode } from "react";
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
      <h3>Last Load</h3>
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

      <h3>Logs</h3>
      {latestRun.latestLogs.length === 0 ? (
        <>
          <div>no logs</div>
        </>
      ) : (
        <Table>
          <tbody>
            {latestRun.latestLogs.map((l, i) => (
              <PipelineLogEntry log={l} key={i} />
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}

export function PipelineLogEntry({ log }: { log: PipelineLog }): ReactNode {
  return (
    <tr>
      <td>{moment(log.timestampCreated).format("MMMM Do YYYY, h:mm:ss a")}</td>
      <td>{log.level}</td>
      <td>{log.value}</td>
    </tr>
  );
}
