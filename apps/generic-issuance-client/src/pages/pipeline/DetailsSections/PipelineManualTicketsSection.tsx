import { Table, Tbody, Th, Thead, Tr } from "@chakra-ui/react";
import {
  LemonadePipelineDefinition,
  LemonadePipelineEventConfig,
  LemonadePipelineTicketTypeConfig,
  ManualTicket,
  PipelineDefinition,
  PretixPipelineDefinition,
  isLemonadePipelineDefinition
} from "@pcd/passport-interface";
import { ReactNode } from "react";
import styled from "styled-components";

export function shouldShowManualTicketsSection(
  pipeline: PipelineDefinition
): pipeline is LemonadePipelineDefinition | PretixPipelineDefinition {
  return isLemonadePipelineDefinition(pipeline);
}

export function PipelineManualTicketsSection({
  pipeline
}: {
  pipeline: LemonadePipelineDefinition | PretixPipelineDefinition;
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
          <Th>email</Th>
          <Th>event name</Th>
          <Th>ticket type</Th>
        </Tr>
      </Thead>
      <Tbody>
        {pipeline.options.manualTickets?.map((t) => (
          <ManualTicketRow ticket={t} pipeline={pipeline} />
        ))}
      </Tbody>
    </Table>
  );
}

function ManualTicketRow({
  ticket,
  pipeline
}: {
  ticket: ManualTicket;
  pipeline: LemonadePipelineDefinition | PretixPipelineDefinition;
}): ReactNode {
  if (isLemonadePipelineDefinition(pipeline)) {
    return <ManualLemonadeTicket pipeline={pipeline} ticket={ticket} />;
  } else {
    return <div>unsupported pipeline type</div>;
  }
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
`;
