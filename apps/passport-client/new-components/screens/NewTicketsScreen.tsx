import { EdDSATicketPCD } from "@pcd/eddsa-ticket-pcd";
import { AppContainer } from "../../components/shared/AppContainer";
import { usePCDs } from "../../src/appHooks";
import { PCD } from "@pcd/pcd-types";
import {
  ReactElement,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from "react";
import styled, { css } from "styled-components";
import { TicketCard } from "../shared/TicketCard";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/solid";
import { Spacer } from "@pcd/passport-ui";
import { FloatingMenu } from "../shared/FloatingMenu";
import { FloatingMenu } from "../shared/FloatingMenu";
import { SettingsBottomModal } from "../shared/SettingsBottomModal";

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
const Scroller = styled.div<{
  amount: number;
  scrollInPx: number;
  padding: number;
}>`
  display: flex;
  flex-direction: row;
  gap: ${GAP}px;
  position: relative;
  transition: 0.2s cubic-bezier(0.25, 0.8, 0.5, 1);
  margin-left: ${({ scrollInPx }) => -scrollInPx}px;
  left: ${({ padding }) => padding}px;
`;

const Line = styled.div<{ padding: number }>`
  width: 5px;
  position: absolute;
  left: ${({ padding }) => padding}px;
  top: 0;
  bottom: 0;
  background: pink;
  z-index: 100;
`;

const Container = styled.div<{ elWidth: number }>`
  margin-top: 20px;
  width: 100%;
  overflow: hidden;
  position: relative;
`;

const disabledCSS = css`
  cursor: not-allowed;
  opacity: 0.2;
  pointer-events: none;
`;

export const PageCircleButton = styled.button<{
  diameter: number;
  padding: number;
  disabled: boolean;
}>`
  ${(p): string => {
    const size = p.diameter + 2 * p.padding + "px";
    return `width: ${size};height: ${size};`;
  }};
  cursor: pointer;
  border-radius: 99px;
  border: none;
  margin: 0;
  padding: ${(p): number => p.padding}px;
  box-shadow:
    0px 1px 3px 0px rgba(0, 0, 0, 0.1),
    0px 1px 2px 0px rgba(0, 0, 0, 0.06);

  background: rgba(255, 255, 255, 0.8);
  ${({ disabled }) => (disabled ? disabledCSS : undefined)}
`;

const ButtonsContainer = styled.div`
  display: flex;
  gap: 12px;
`;

const StyledAppContainer = styled(AppContainer)`
  gap: 20px;
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
      console.log(
        (scrollRef.current.scrollWidth - GAP * tickets.size) / tickets.size
      );
      setWidth(
        Math.ceil(
          (scrollRef.current.scrollWidth - GAP * tickets.size) / tickets.size
        )
      );
    }
  }, [setWidth, tickets.size]);

  useEffect(() => {
    console.log(
      "padding,",
      (window.screen.width - width) / 2,
      window.screen.width,
      width
    );
  }, [width]);
  return (
    <AppContainer bg="gray" noPadding>
      <Container elWidth={width}>
        <Scroller
          padding={(window.screen.width - width) / 2}
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
        <Line padding={(window.screen.width - width) / 2} />
      </Container>
      <Spacer h={20} />
      <ButtonsContainer>
        <PageCircleButton
          disabled={currentPos === 0}
          padding={6}
          diameter={28}
          onClick={() => {
            setCurrentPos((old) => {
              if (old === 0) return old;
              return old - 1;
            });
          }}
        >
          <ChevronLeftIcon
            width={20}
            height={20}
            color="var(--text-tertiary)"
          />
        </PageCircleButton>
        <PageCircleButton
          disabled={currentPos === tickets.size - 1}
          padding={6}
          diameter={28}
          onClick={() => {
            setCurrentPos((old) => {
              if (old === tickets.size - 1) return old;
              return old + 1;
            });
          }}
        >
          <ChevronRightIcon
            width={20}
            height={20}
            color="var(--text-tertiary)"
          />
        </PageCircleButton>
      </ButtonsContainer>
      <Spacer h={20} />
      <FloatingMenu />
      <SettingsBottomModal />
    </AppContainer>
  );
};
