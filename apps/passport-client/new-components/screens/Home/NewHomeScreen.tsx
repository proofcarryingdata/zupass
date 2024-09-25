import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/solid";
import { EdDSATicketPCD, ITicketData } from "@pcd/eddsa-ticket-pcd";
import { Spacer } from "@pcd/passport-ui";
import { PCD } from "@pcd/pcd-types";
import {
  ReactElement,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from "react";
import { useNavigate } from "react-router-dom";
import styled, { FlattenSimpleInterpolation, css } from "styled-components";
import { AppContainer } from "../../../components/shared/AppContainer";
import { usePCDs, useSelf, useUserIdentityPCD } from "../../../src/appHooks";
import { useSyncE2EEStorage } from "../../../src/useSyncE2EEStorage";
import { FloatingMenu } from "../../shared/FloatingMenu";
import { CardBody } from "../../../components/shared/PCDCard";
import { TicketCard } from "../../shared/TicketCard";
import { NewModals } from "../../shared/Modals/NewModals";

const GAP = 4;
const ANOTHER_GAP = 40;
const SHOW_HELPER_LINES = false;
const isEventTicketPCD = (
  pcd: PCD<unknown, unknown>
): pcd is EdDSATicketPCD => {
  const typedPcd = pcd as EdDSATicketPCD;
  // TODO: fetch the pods type as well and prioritize it if theres a conflict.
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
  offset: number;
  gap: number;
}>`
  display: flex;
  flex-direction: row;
  gap: ${({ gap }): number => gap}px;
  position: relative;
  transition: 0.2s cubic-bezier(0.25, 0.8, 0.5, 1);
  left: ${({ scrollInPx }): number => -scrollInPx}px;
  transform: translateX(${({ offset }): number => offset}px);
`;

const Line = styled.div<{ padding: number }>`
  width: 5px;
  position: absolute;
  left: ${({ padding }): number => padding}px;
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
  ${({ disabled }): FlattenSimpleInterpolation =>
    disabled ? disabledCSS : undefined}
`;

const ButtonsContainer = styled.div`
  display: flex;
  gap: 12px;
`;

const TicketsContainer = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const positionInPx = (
  currentPos: number,
  elWidth: number,
  len: number,
  gap: number
): number => {
  const max = len * (elWidth + gap);
  const truePos = currentPos * (elWidth + gap);
  return truePos > max ? max : truePos;
};

const calculateElWidth = (scrollWidth: number, gap: number, len: number) => {
  return Math.ceil((scrollWidth - gap * (len - 1)) / len);
};

const getEventDetails = (tickets: EdDSATicketPCD[]): ITicketData => {
  return (
    tickets.find((ticket) => !!ticket.claim.ticket.imageUrl)?.claim.ticket ??
    tickets[0].claim.ticket
  );
};

export const NewHomeScreen = (): ReactElement => {
  useSyncE2EEStorage();
  const tickets = useTickets();
  const [currentPos, setCurrentPos] = useState(0);
  const [currentEventName, setCurrentEventName] = useState<string>();
  const [width, setWidth] = useState(0);
  const [width2, setWidth2] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pcdCardScrollRef = useRef<HTMLDivElement>(null);
  const self = useSelf();
  const navigate = useNavigate();
  const userIdentityPCD = useUserIdentityPCD();

  useEffect(() => {
    if (!self) {
      console.log("Redirecting to login screen");
      navigate("/new/login", { replace: true });
    }
  });

  useLayoutEffect(() => {
    if (scrollRef.current) {
      setWidth(
        calculateElWidth(scrollRef.current.scrollWidth, GAP, tickets.size)
      );
    }
    if (pcdCardScrollRef.current) {
      setWidth2(
        calculateElWidth(
          pcdCardScrollRef.current.scrollWidth,
          ANOTHER_GAP,
          tickets.size
        )
      );
    }
  }, [setWidth, setWidth2, tickets.size]);

  useEffect(() => {
    console.log("padding", (window.screen.width - width2) / 2);
  }, [width2]);

  return (
    <AppContainer bg="gray" noPadding>
      <Container elWidth={width}>
        <Scroller
          gap={GAP}
          offset={(window.screen.width - width) / 2}
          ref={scrollRef}
          scrollInPx={positionInPx(currentPos, width, tickets.size - 1, GAP)}
          amount={tickets.size - 1}
        >
          {Array.from(tickets).map(([eventName, eventTickets], i) => {
            console.log(eventTickets);
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
                cardColor={i % 2 === 0 ? "purple" : "orange"}
              />
            );
          })}
        </Scroller>
        {SHOW_HELPER_LINES && (
          <Line padding={(window.screen.width - width) / 2} />
        )}
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
      <Container elWidth={width2}>
        <Scroller
          gap={ANOTHER_GAP}
          ref={pcdCardScrollRef}
          scrollInPx={positionInPx(
            currentPos,
            width2,
            tickets.size,
            ANOTHER_GAP
          )}
          offset={(window.screen.width - width2) / 2}
          amount={tickets.size - 1}
        >
          {Array.from(tickets).map(([eventName, eventTickets]) => {
            return (
              <TicketsContainer>
                {eventTickets.map((ticket) => (
                  <CardBody newUI={true} pcd={ticket} isMainIdentity={false} />
                ))}
              </TicketsContainer>
            );
          })}
        </Scroller>
        {SHOW_HELPER_LINES && (
          <Line padding={(window.screen.width - width2) / 2} />
        )}
      </Container>
      <Spacer h={48} />
      <FloatingMenu />
      <NewModals />
    </AppContainer>
  );
};
