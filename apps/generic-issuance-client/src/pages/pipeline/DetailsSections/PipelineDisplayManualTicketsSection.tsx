import { Table, Tbody, Th, Thead, Tr } from "@chakra-ui/react";
import {
  LemonadePipelineDefinition,
  LemonadePipelineEventConfig,
  LemonadePipelineTicketTypeConfig,
  ManualTicket,
  PipelineDefinition,
  isLemonadePipelineDefinition
} from "@pcd/passport-interface";
import { ReactNode } from "react";
import styled from "styled-components";

export function supportsAddingManualTickets(
  pipeline: PipelineDefinition
): pipeline is LemonadePipelineDefinition {
  return isLemonadePipelineDefinition(pipeline);
}

/**
 * For {@link LemonadePipeline} only. Shows a table of all of
 * this pipeline's manual tickets
 */
export function PipelineDisplayManualTicketsSection({
  pipeline
}: {
  pipeline: LemonadePipelineDefinition;
  isAdminView: boolean;
}): ReactNode {
  const tix = pipeline.options.manualTickets;

  let content = <></>;

  if (!tix || tix.length === 0) {
    content = <div>no manual tickets</div>;
  } else if (isLemonadePipelineDefinition(pipeline)) {
    content = <LemonadeManualTicketTable pipeline={pipeline} />;
  } else {
    content = <div>unsupported pipeline type</div>;
  }

  return <Container>{content}</Container>;
}

function LemonadeManualTicketTable({
  pipeline
}: {
  pipeline: LemonadePipelineDefinition;
}): ReactNode {
  return (
    <Table>
      <Thead>
        <Tr>
          <Th>name</Th>
          <Th>email</Th>
          <Th>event</Th>
          <Th>type</Th>
        </Tr>
      </Thead>
      <Tbody>
        {pipeline.options.manualTickets?.map((t) => (
          <ManualLemonadeTicket ticket={t} pipeline={pipeline} key={t.id} />
        ))}
      </Tbody>
    </Table>
  );
}

function ManualLemonadeTicket({
  ticket,
  pipeline
}: {
  ticket: ManualTicket;
  pipeline: LemonadePipelineDefinition;
}): ReactNode {
  const details = getLemonadeTicketDetails(ticket, pipeline);

  return (
    <tr>
      <td>{ticket.attendeeName}</td>
      <td>{ticket.attendeeEmail}</td>
      <td>{details?.event?.name}</td>
      <td>{details?.product?.name}</td>
    </tr>
  );
}

function getLemonadeTicketDetails(
  ticket: ManualTicket,
  pipeline: LemonadePipelineDefinition
): {
  event?: LemonadePipelineEventConfig;
  product?: LemonadePipelineTicketTypeConfig;
} {
  const event = pipeline.options.events.find(
    (e) => e.genericIssuanceEventId === ticket.eventId
  );
  const product = event?.ticketTypes.find(
    (t) => t.genericIssuanceProductId === ticket.productId
  );

  return { event, product };
}

const Container = styled.div`
  width: 100%;
  max-height: 400px;
  overflow-y: scroll;

  table {
    font-size: 0.8em;

    td {
      border-bottom: 1px solid rgba(0, 0, 0, 0.5);
      padding: 8px 0px;
    }
  }
`;
