import { PipelineInfoConsumer } from "@pcd/passport-interface";
import { ReactNode } from "react";
import styled from "styled-components";

/**
 * Used to display the consumers for a pipeline.
 */
export function PipelineLatestConsumersSection({
  latestConsumers
}: {
  latestConsumers?: PipelineInfoConsumer[];
}): ReactNode {
  if (!latestConsumers || latestConsumers.length === 0) {
    return <div>no consumers.</div>;
  }

  return (
    <ConsumerTable>
      <tr>
        <th>Email</th>
        <th>Created</th>
        <th>Updated</th>
      </tr>
      <>
        {latestConsumers.map((consumer) => {
          return (
            <tr>
              <td>{consumer.email}</td>
              <td>{new Date(consumer.timeCreated).toLocaleString()}</td>
              <td>{new Date(consumer.timeUpdated).toLocaleString()}</td>
            </tr>
          );
        })}
      </>
    </ConsumerTable>
  );
}

const ConsumerTable = styled.table`
  /* font-size: 0.8rem; */
  border-spacing: 5px 2px;
  border-collapse: separate;

  th {
    /* font-size: 0.8rem !important; */
    font-family: var(--chakra-fonts-body) !important;
    font-weight: bold !important;
    text-align: left;
  }

  td {
    padding-right: 32px;
  }
`;
