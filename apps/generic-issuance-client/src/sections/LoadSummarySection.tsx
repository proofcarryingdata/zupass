import { PipelineLoadSummary, PipelineLog } from "@pcd/passport-interface";
import moment from "moment";
import { ReactNode } from "react";
import { Table } from "../components/Core";

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
  const durationMs =
    latestRun.lastRunEndTimestamp - latestRun.lastRunStartTimestamp;

  return (
    <div>
      <h3>Last Run</h3>
      <Table>
        <tbody>
          <tr>
            <td>start</td>
            <td>{moment(startDate).format("MMMM Do YYYY, h:mm:ss.SSS a")}</td>
          </tr>
          <tr>
            <td>end</td>
            <td>{moment(endDate).format("MMMM Do YYYY, h:mm:ss.SSS a")}</td>
          </tr>
          <tr>
            <td>duration</td>
            <td>{durationMs}ms</td>
          </tr>
          <tr>
            <td>datas loaded</td>
            <td>{latestRun.atomsLoaded}</td>
          </tr>
          <tr>
            <td>success</td>
            <td>{latestRun.success.toString()}</td>
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
