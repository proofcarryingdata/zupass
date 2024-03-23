import { Table, Tbody, Th, Thead, Tr } from "@chakra-ui/react";
import {
  LemonadePipelineDefinition,
  ManualTicket,
  PipelineDefinition,
  PipelineType,
  PretixPipelineDefinition,
  isLemonadePipelineDefinition,
  isPretixPipelineDefinition
} from "@pcd/passport-interface";
import { ReactNode } from "react";
import styled from "styled-components";

export function supportsManualTicketTable(
  pipeline: PipelineDefinition
): pipeline is SupportsManualTicketTablePipelineDefinition {
  return (
    isLemonadePipelineDefinition(pipeline) ||
    isPretixPipelineDefinition(pipeline)
  );
}

type SupportsManualTicketTablePipelineDefinition =
  | LemonadePipelineDefinition
  | PretixPipelineDefinition;

/**
 * Shows a table of all of this pipeline's manual tickets.
 * Only supported by certain pipelines, see return type of
 * {@link supportsManualTicketTable}
 */
export function PipelineDisplayManualTicketsSection({
  pipeline
}: {
  pipeline: SupportsManualTicketTablePipelineDefinition;
  isAdminView: boolean;
}): ReactNode {
  const tix = pipeline.options.manualTickets;

  let content = <></>;

  if (!tix || tix.length === 0) {
    content = <div>no manual tickets</div>;
  } else if (supportsManualTicketTable(pipeline)) {
    content = <ManualTicketTable pipeline={pipeline} />;
  } else {
    content = <div>unsupported pipeline type</div>;
  }

  return <Container>{content}</Container>;
}

function ManualTicketTable({
  pipeline
}: {
  pipeline: SupportsManualTicketTablePipelineDefinition;
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
          <ManualTicket ticket={t} pipeline={pipeline} key={t.id} />
        ))}
      </Tbody>
    </Table>
  );
}

function ManualTicket({
  ticket,
  pipeline
}: {
  ticket: ManualTicket;
  pipeline: SupportsManualTicketTablePipelineDefinition;
}): ReactNode {
  const details = getManualTicketDetails(ticket, pipeline);

  return (
    <tr>
      <td>{ticket.attendeeName}</td>
      <td>{ticket.attendeeEmail}</td>
      <td>{details.eventName}</td>
      <td>{details.productName}</td>
    </tr>
  );
}

interface ManualTicketDetails {
  eventName?: string;
  productName?: string;
}

function getManualTicketDetails(
  ticket: ManualTicket,
  pipeline: SupportsManualTicketTablePipelineDefinition
): ManualTicketDetails {
  switch (pipeline.type) {
    case PipelineType.Lemonade: {
      const event = pipeline.options.events.find(
        (e) => e.genericIssuanceEventId === ticket.eventId
      );
      const product = event?.ticketTypes.find(
        (t) => t.genericIssuanceProductId === ticket.productId
      );

      return { eventName: event?.name, productName: product?.name };
    }
    case PipelineType.Pretix: {
      const event = pipeline.options.events.find(
        (e) => e.genericIssuanceId === ticket.eventId
      );
      const product = event?.products.find(
        (t) => t.genericIssuanceId === ticket.productId
      );

      return { eventName: event?.name, productName: product?.name };
    }
  }
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
