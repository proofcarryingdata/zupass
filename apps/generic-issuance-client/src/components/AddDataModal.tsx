import {
  Button,
  ButtonGroup,
  FormControl,
  FormLabel,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay
} from "@chakra-ui/react";
import {
  CSVPipelineDefinition,
  CSVTicketPipelineDefinition,
  isCSVTicketPipelineDefinition
} from "@pcd/passport-interface";
import { validateEmail } from "@pcd/util";
import { CreatableSelect } from "chakra-react-select";
import { stringify as stringifyCSV } from "csv-stringify/sync";
import { ReactNode, useCallback, useMemo, useState } from "react";
import { savePipeline } from "../helpers/Mutations";
import { useJWT } from "../helpers/userHooks";
import { syncParseCSV } from "../pages/pipeline/PipelineEditSection/parseCSV";

type Option = {
  label: string;
  value: string;
};

export function AddDataModal({
  addingData,
  pipeline,
  onClose
}: {
  addingData: boolean;
  pipeline: CSVPipelineDefinition | CSVTicketPipelineDefinition;
  onClose: () => void;
}): ReactNode {
  const userJWT = useJWT();
  const [inProgress, setInProgress] = useState(false);

  const parsedTickets = useMemo(() => {
    const csv = pipeline.options.csv;
    return syncParseCSV(csv);
  }, [pipeline.options.csv]);

  const [eventNames, ticketNames, imageUrls] = useMemo(() => {
    const eventNames = new Set<string>();
    const ticketNames = new Set<string>();
    const imageUrls = new Set<string>();

    if (isCSVTicketPipelineDefinition(pipeline)) {
      eventNames.add(pipeline.options.eventName);
      for (let i = 1; i < parsedTickets.length; i++) {
        const row = parsedTickets[i];
        ticketNames.add(row[0]);
        if (row[3]) {
          imageUrls.add(row[3]);
        }
      }
    } else {
      for (let i = 1; i < parsedTickets.length; i++) {
        const row = parsedTickets[i];
        eventNames.add(row[0]);
        ticketNames.add(row[1]);
        if (row[4]) {
          imageUrls.add(row[4]);
        }
      }
    }

    return [
      [...eventNames].map((eventName) => ({
        label: eventName,
        value: eventName
      })),
      [...ticketNames].map((ticketName) => ({
        label: ticketName,
        value: ticketName
      })),
      [...imageUrls].map((imageUrl) => ({
        label: imageUrl,
        value: imageUrl
      }))
    ];
  }, [parsedTickets, pipeline]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [eventName, setEventName] = useState<Option | null>(eventNames[0]);
  const [ticketName, setTicketName] = useState<Option | null>(ticketNames[0]);
  const [imageUrl, setImageUrl] = useState<Option | null>(imageUrls[0]);

  const canBeAdded =
    name.length > 0 &&
    email.length > 0 &&
    validateEmail(email) &&
    !!eventName &&
    !!ticketName &&
    !!imageUrl;

  const addTicket = useCallback(async () => {
    if (!eventName || !ticketName || !name || !email || !imageUrl) {
      return;
    }

    if (
      !confirm(
        `are you sure you want to add this ticket?

name: ${name}
email: ${email}
event: ${eventName.label}
ticket: ${ticketName.label}`
      )
    ) {
      return;
    }

    const pipelineCopy = JSON.parse(
      JSON.stringify(pipeline)
    ) as CSVPipelineDefinition;

    // CSV ticket pipeline has four columns, CSV pipeline has six
    const newTickets = isCSVTicketPipelineDefinition(pipeline)
      ? parsedTickets.concat([[ticketName.value, name, email, imageUrl.value]])
      : parsedTickets.concat([
          [eventName.value, ticketName.value, name, email, imageUrl.value, ""]
        ]);

    pipelineCopy.options.csv = stringifyCSV(newTickets);

    if (!userJWT) {
      alert("not logged in");
      return;
    }

    setInProgress(true);
    const res = await savePipeline(userJWT, JSON.stringify(pipelineCopy));

    if (res.success) {
      window.location.reload();
    } else {
      setInProgress(false);
      alert(res.error);
    }
  }, [
    email,
    eventName,
    imageUrl,
    name,
    parsedTickets,
    pipeline,
    ticketName,
    userJWT
  ]);

  const triggerClose = useCallback(() => {
    setName("");
    setEmail("");
    setEventName(eventNames[0]);
    setTicketName(ticketNames[0]);
    setImageUrl(imageUrls[0]);
    setInProgress(false);
    onClose();
  }, [eventNames, imageUrls, onClose, ticketNames]);

  return (
    <Modal
      onClose={triggerClose}
      isOpen={addingData}
      isCentered
      motionPreset="slideInBottom"
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Add Ticket</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <FormControl mb={2}>
            <FormLabel>Event Name</FormLabel>
            <CreatableSelect
              options={eventNames}
              value={eventName}
              onChange={(newValue) => setEventName(newValue)}
              isClearable={true}
            />
          </FormControl>
          <FormControl mb={2}>
            <FormLabel>Ticket Name</FormLabel>
            <CreatableSelect
              options={ticketNames}
              value={ticketName}
              onChange={(newValue) => setTicketName(newValue)}
              isClearable={true}
            />
          </FormControl>
          <FormControl mb={2}>
            <FormLabel>Attendee Name</FormLabel>
            <Input
              value={name}
              onChange={(e): void => setName(e.target.value)}
              placeholder="Bob Glob"
              type="text"
              width="sm"
              maxW={"100%"}
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
              maxW={"100%"}
              autoComplete="off"
              data-1p-ignore
            />
          </FormControl>

          <FormControl mb={2}>
            <FormLabel>Image URL</FormLabel>
            <CreatableSelect
              isClearable={true}
              options={imageUrls}
              value={imageUrl}
              onChange={(newValue) => setImageUrl(newValue)}
            />
          </FormControl>
        </ModalBody>
        <ModalFooter>
          <ButtonGroup>
            <Button
              onClick={addTicket}
              colorScheme="blue"
              isDisabled={!canBeAdded || inProgress}
            >
              {inProgress ? "Adding..." : "Add"}
            </Button>
            <Button onClick={triggerClose}>Cancel</Button>
          </ButtonGroup>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
