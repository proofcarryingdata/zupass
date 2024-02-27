import {
  LemonadePipelineDefinition,
  LemonadePipelineEventConfig,
  LemonadePipelineTicketTypeConfig,
  ManualTicket,
  PipelineDefinition,
  PretixPipelineDefinition,
  isLemonadePipelineDefinition,
  isPretixPipelineDefinition
} from "@pcd/passport-interface";
import { ReactNode } from "react";

export function shouldShowManualTicketsSection(
  pipeline: PipelineDefinition
): pipeline is LemonadePipelineDefinition | PretixPipelineDefinition {
  return (
    isLemonadePipelineDefinition(pipeline) ||
    isPretixPipelineDefinition(pipeline)
  );
}

export function PipelineManualTicketsSection({
  pipeline
}: {
  pipeline: LemonadePipelineDefinition | PretixPipelineDefinition;
  isAdminView: boolean;
}): ReactNode {
  const tix = pipeline.options.manualTickets;

  if (!tix || tix.length === 0) {
    return <div>no manual tickets</div>;
  }

  return (
    <div>
      {tix.map((t) => (
        <ManualTicket pipeline={pipeline} ticket={t} key={t.id} />
      ))}
    </div>
  );
}

function ManualTicket({
  ticket,
  pipeline
}: {
  ticket: ManualTicket;
  pipeline: LemonadePipelineDefinition | PretixPipelineDefinition;
}): ReactNode {
  if (isLemonadePipelineDefinition(pipeline)) {
    return <ManualLemonadeTicket pipeline={pipeline} ticket={ticket} />;
  } else if (isPretixPipelineDefinition(pipeline)) {
    return <ManualPretixTicket pipeline={pipeline} ticket={ticket} />;
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
    <div>
      {ticket.attendeeEmail} - {details?.event?.name} - {details?.product?.name}
    </div>
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

function ManualPretixTicket({
  ticket,
  pipeline
}: {
  ticket: ManualTicket;
  pipeline: PretixPipelineDefinition;
}): ReactNode {
  return (
    <div>
      {ticket.id} - {ticket.attendeeEmail}
    </div>
  );
}
