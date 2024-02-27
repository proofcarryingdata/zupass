import { Button } from "@chakra-ui/react";
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

export function shouldShowAddManualTicketSection(
  pipeline: PipelineDefinition
): pipeline is LemonadePipelineDefinition {
  return isLemonadePipelineDefinition(pipeline);
}

export function PipelineAddManualTicketSection({
  pipeline
}: {
  pipeline: LemonadePipelineDefinition;
  isAdminView: boolean;
}): ReactNode {
  let content = <></>;

  if (isLemonadePipelineDefinition(pipeline)) {
    content = <LemonadeAddManualTicket pipeline={pipeline} />;
  } else {
    content = <div>unsupported pipeline type</div>;
  }

  return <Container>{content}</Container>;
}

function LemonadeAddManualTicket({
  pipeline
}: {
  pipeline: LemonadePipelineDefinition;
}): ReactNode {
  return (
    <div>
      add manual ticket
      <Button colorScheme="green" variant="outline">
        add
      </Button>
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

const Container = styled.div`
  width: 100%;
  max-height: 400px;
  overflow-y: scroll;
`;
