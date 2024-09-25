import { EdDSATicketPCD } from "@pcd/eddsa-ticket-pcd";
import { PCD } from "@pcd/pcd-types";
import { ReactElement, useLayoutEffect, useRef, useState } from "react";
import styled from "styled-components";
import { AppContainer } from "../../components/shared/AppContainer";
import { usePCDs } from "../../src/appHooks";
import { Button2 } from "../shared/Button";
import { FloatingMenu } from "../shared/FloatingMenu";
import { TicketCard } from "../shared/TicketCard";

const GAP = 4;
const isEventTicketPCD = (
  pcd: PCD<unknown, unknown>
): pcd is EdDSATicketPCD => {
  const typedPcd = pcd as EdDSATicketPCD;

  return typedPcd.type === "eddsa-ticket-pcd" && !!typedPcd?.claim?.ticket;
};
const useTickets = (): Map<string, EdDSATicketPCD[]> => {
  const allPCDs = usePCDs();
  const tickets = allPCDs.filter(isEventTicketPCD);
  const eventsMap = new Map<string, EdDSATicketPCD[]>();

  for (const ticket of tickets) {
    const ticketList = eventsMap.get(ticket.claim.ticket.eventName) ?? [];

    if (!eventsMap.get(ticket.claim.ticket.eventName)) {
      eventsMap.set(ticket.claim.ticket.eventName, ticketList);
    }

    ticketList.push(ticket);
  }
  return eventsMap;
};

const Scroller = styled.div<{ amount: number; scrollInPx: number }>`
  display: flex;
  flex-direction: row;
  gap: ${GAP}px;
  position: relative;
  margin-left: ${({ scrollInPx }) => -scrollInPx}px;
`;

const Container = styled.div<{ elWidth: number }>`
  width: ${({ elWidth }) => elWidth}px;
  overflow: hidden;
`;

const positionInPx = (currentPos: number, elWidth: number, len: number) => {
  const max = len * (elWidth + GAP);
  const truePos = currentPos * (elWidth + GAP);
  return truePos > max ? max : truePos;
};

const getEventDetails = (tickets: EdDSATicketPCD[]) => {
  return tickets[0].claim.ticket;
};

export const NewTicketsScreen = (): ReactElement => {
  const tickets = useTickets();
  const [currentPos, setCurrentPos] = useState(0);
  const [width, setWidth] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    console.log("called");
    if (scrollRef.current) {
      setWidth(
        Math.ceil(
          (scrollRef.current.scrollWidth - GAP * tickets.size) / tickets.size
        )
      );
    }
  }, [setWidth, tickets.size]);
  return (
    <AppContainer bg="gray">
      <Container elWidth={width}>
        <Scroller
          ref={scrollRef}
          scrollInPx={positionInPx(currentPos, width, tickets.size - 1)}
          amount={tickets.size - 1}
        >
          {Array.from(tickets).map(([eventName, eventTickets]) => {
            const eventDetails = getEventDetails(eventTickets);
            return (
              <TicketCard
                address={eventName}
                title={eventName}
                ticketDate={new Date(
                  eventDetails.timestampSigned
                ).toDateString()}
                imgSource={eventDetails.imageUrl}
                ticketCount={eventTickets.length}
                cardColor={Math.random() - 0.5 > 0 ? "orange" : "purple"}
              />
            );
          })}
        </Scroller>
      </Container>
      <Button2
        onClick={() => {
          setCurrentPos((old) => old + 1);
        }}
      >
        click me
      </Button2>
      <FloatingMenu />
    </AppContainer>
  );
};
