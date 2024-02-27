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
import { randomUUID, validateEmail } from "@pcd/util";
import { ReactNode, useCallback, useMemo, useState } from "react";
import styled from "styled-components";
import { savePipeline } from "../../../helpers/Mutations";
import { useJWT } from "../../../helpers/userHooks";

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
  const userJWT = useJWT();
  const [inProgress, setInProgress] = useState(false);
  const [ticketTypeId, setTicketTypeId] = useState("");
  const [ticketTypeName, setTicketTypeName] = useState("");
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
  const [eventName, setEventName] = useState(eventIdOptions[0].name);

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

  const onAddClick = useCallback(async () => {
    const pipelineCopy = JSON.parse(
      JSON.stringify(pipeline)
    ) as LemonadePipelineDefinition;

    pipelineCopy.options.manualTickets =
      pipelineCopy.options.manualTickets ?? [];

    pipelineCopy.options.manualTickets.push({
      attendeeEmail: email,
      attendeeName: name,
      eventId,
      productId: ticketTypeId,
      id: randomUUID()
    });

    if (
      !confirm(
        `are you sure you want to add this ticket?\n${name} (${email})\n${eventName} - ${ticketTypeName}`
      )
    ) {
      return;
    }

    if (!userJWT) {
      alert("not logged in");
      return;
    }

    setInProgress(true);

    const res = await savePipeline(userJWT, JSON.stringify(pipelineCopy));

    if (res.success) {
      window.location.reload();
    } else {
      alert(res.error);
    }
  }, [
    email,
    eventId,
    eventName,
    name,
    pipeline,
    ticketTypeId,
    ticketTypeName,
    userJWT
  ]);

  return (
    <>
      <FormControl mb={2}>
        <FormLabel>Event</FormLabel>
        <Select
          w="sm"
          mt={2}
          value={eventId}
          onChange={(e): void => {
            const id = e.target.value;
            setEventId(id);
            setEventName(
              eventIdOptions.find((e) => e.value === id)?.name ?? ""
            );
          }}
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
          onChange={(e): void => {
            const id = e.target.value;
            setTicketTypeId(id);
            setTicketTypeName(
              ticketTypeIdOptions.find((e) => e.value === id)?.name ?? ""
            );
          }}
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
          isInvalid={!validateEmail(email) && email.length !== 0}
          value={email}
          onChange={(e): void => setEmail(e.target.value)}
          placeholder="email@provider.tld"
          type="email"
          width="sm"
          autoComplete="off"
          data-1p-ignore
        />
      </FormControl>

      <Button
        colorScheme="green"
        mt={4}
        width="sm"
        onClick={onAddClick}
        isLoading={inProgress}
      >
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
