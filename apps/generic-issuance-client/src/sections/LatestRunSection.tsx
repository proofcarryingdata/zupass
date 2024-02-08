import { PipelineDefinition, PipelineRunInfo } from "@pcd/passport-interface";
import moment from "moment";
import { ReactNode } from "react";
import styled from "styled-components";

export function LatestRunSection({
  latestRun,
  pipeline
}: {
  latestRun: PipelineRunInfo;
  pipeline: PipelineDefinition;
}): ReactNode {
  const startDate = new Date(latestRun.lastRunStartTimestamp);
  const endDate = new Date(latestRun.lastRunStartTimestamp);
  const durationMs =
    latestRun.lastRunStartTimestamp - latestRun.lastRunStartTimestamp;

  return (
    <div>
      <h3>Last Run</h3>
      <Table>
        <tbody>
          <tr>
            <td>start</td>
            <td>{moment(startDate).format("MMMM Do YYYY, h:mm:ss a")}</td>
          </tr>
          <tr>
            <td>end</td>
            <td>{moment(endDate).format("MMMM Do YYYY, h:mm:ss a")}</td>
          </tr>
          <tr>
            <td>duration</td>
            <td>{durationMs}ms</td>
          </tr>
        </tbody>
      </Table>

      {/* <pre style={{ border: "1px solid white", padding: "8px" }}>
        {JSON.stringify(latestRun, null, 2)}
      </pre> */}
    </div>
  );
}

const Table = styled.table`
  border-collapse: collapse;

  tr {
    td {
      padding: 4px 8px;
      border: 1px solid white;
    }
    td:first-child {
      text-align: left;
    }
    td:last-child {
      text-align: right;
    }
  }
`;
