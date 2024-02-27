import {
  Button,
  FormControl,
  FormLabel,
  Input,
  Select
} from "@chakra-ui/react";
import {
  LemonadePipelineDefinition,
  PipelineDefinition,
  isLemonadePipelineDefinition
} from "@pcd/passport-interface";
import { ReactNode, useCallback, useMemo, useState } from "react";
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

interface IOption {
  value: string;
  name: string;
}

function LemonadeAddManualTicket({
  pipeline
}: {
  pipeline: LemonadePipelineDefinition;
}): ReactNode {
  const [ticketTypeId, setTicketTypeId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const eventIdOptions: IOption[] = useMemo(() => {
    return pipeline.options.events.map((e) => {
      return {
        value: e.genericIssuanceEventId,
        name: e.name
      };
    });
  }, [pipeline]);

  const [eventId, setEventId] = useState(eventIdOptions[0].value);

  const ticketTypeIdOptions: IOption[] = useMemo(() => {
    const event = pipeline.options.events.find(
      (e) => e.genericIssuanceEventId === eventId
    );

    if (event) {
      return event.ticketTypes.map((t) => ({
        name: t.name,
        value: t.genericIssuanceProductId
      }));
    }

    return [];
  }, [eventId, pipeline.options.events]);

  const onAddClick = useCallback(() => {
    alert("click");
  }, []);

  return (
    <>
      <FormControl mb={2}>
        <FormLabel>Event</FormLabel>
        <Select
          w="sm"
          mt={2}
          value={eventId}
          onChange={(e): void => setEventId(e.target.value)}
        >
          {eventIdOptions.map((o) => (
            <option value={o.value} key={o.value}>
              {o.name}
            </option>
          ))}
        </Select>
      </FormControl>
      <FormControl mb={2}>
        <FormLabel>Ticket Type</FormLabel>
        <Select
          w="sm"
          mt={2}
          value={ticketTypeId}
          onChange={(e): void => setTicketTypeId(e.target.value)}
        >
          {ticketTypeIdOptions.map((o) => (
            <option value={o.value} key={o.value}>
              {o.name}
            </option>
          ))}
        </Select>
      </FormControl>
      <FormControl mb={2}>
        <FormLabel>Attendee Name</FormLabel>
        <Input
          value={name}
          onChange={(e): void => setName(e.target.value)}
          placeholder="Bob Glob"
          type="text"
          width="sm"
        />
      </FormControl>
      <FormControl mb={2}>
        <FormLabel>Attendee Email</FormLabel>
        <Input
          value={email}
          onChange={(e): void => setEmail(e.target.value)}
          placeholder="email@provider.tld"
          type="email"
          width="sm"
          autoComplete="off"
          data-1p-ignore
        />
      </FormControl>
      <Button colorScheme="green" mt={4} width="sm" onClick={onAddClick}>
        Add Ticket
      </Button>
    </>
  );
}

const Container = styled.div`
  width: 100%;
  max-height: 400px;
  overflow-y: scroll;
`;
