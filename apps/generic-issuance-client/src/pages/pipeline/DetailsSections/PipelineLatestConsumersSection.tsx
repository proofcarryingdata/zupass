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
    return (
      <div>
        When someone subscribes to this Pipeline's feed, and gets a ticket, they
        are recorded here.
      </div>
    );
  }

  return (
    <ConsumerTable>
      <thead>
        <tr>
          <th>Email</th>
          <th>Created</th>
          <th>Updated</th>
        </tr>
      </thead>
      <tbody>
        {latestConsumers.map((consumer, i) => {
          return (
            <tr key={i}>
              <td>{consumer.email}</td>
              <td>{new Date(consumer.timeCreated).toLocaleString()}</td>
              <td>{new Date(consumer.timeUpdated).toLocaleString()}</td>
            </tr>
          );
        })}
      </tbody>
    </ConsumerTable>
  );
}

const ConsumerTable = styled.table`
  border-spacing: 5px 2px;
  border-collapse: separate;

  th {
    font-family: var(--chakra-fonts-body) !important;
    font-weight: bold !important;
    text-align: left;
  }

  td {
    padding-right: 32px;
  }
`;
