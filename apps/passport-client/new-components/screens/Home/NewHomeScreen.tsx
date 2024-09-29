import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/solid";
import {
  EdDSATicketPCD,
  EdDSATicketPCDTypeName,
  ITicketData,
  isEdDSATicketPCD
} from "@pcd/eddsa-ticket-pcd";
import { Spacer } from "@pcd/passport-ui";
import { PCD } from "@pcd/pcd-types";
import {
  PODTicketPCD,
  PODTicketPCDTypeName,
  isPODTicketPCD
} from "@pcd/pod-ticket-pcd";
import {
  ReactElement,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { useNavigate } from "react-router-dom";
import styled, { FlattenSimpleInterpolation, css } from "styled-components";
import { AppContainer } from "../../../components/shared/AppContainer";
import { CardBody } from "../../../components/shared/PCDCard";
import { usePCDs, useSelf } from "../../../src/appHooks";
import { useSyncE2EEStorage } from "../../../src/useSyncE2EEStorage";
import { FloatingMenu } from "../../shared/FloatingMenu";
import { NewModals } from "../../shared/Modals/NewModals";
import { TicketCard } from "../../shared/TicketCard";
import { Typography } from "../../shared/Typography";

const GAP = 4;
const ANOTHER_GAP = 40;
const SHOW_HELPER_LINES = false;
const TICKET_GAP = 20;
type TicketType = EdDSATicketPCD | PODTicketPCD;
const TypeNames = [EdDSATicketPCDTypeName, PODTicketPCDTypeName] as const;
type TicketTypeName = (typeof TypeNames)[number];
type TicketPack = {
  eventTicket: TicketType;
  addOns: TicketType[];
  attendeeEmail: string;
  eventId: string;
  packType: TicketTypeName;
};

const isEventTicketPCD = (pcd: PCD<unknown, unknown>): pcd is TicketType => {
  // TODO: fetch the pods type as well and prioritize it if theres a conflict.
  return isEdDSATicketPCD(pcd) || isPODTicketPCD(pcd);
};

const useTickets = (): Array<[string, TicketPack[]]> => {
  const allPCDs = usePCDs();
  const tickets = allPCDs.filter(isEventTicketPCD);
  const ticketsTrigger = tickets.map((t) => t.id).join(" ");
  return useMemo(() => {
    const eventsMap = new Map<string, TicketPack[]>();
    for (const ticket of tickets) {
      console.log(ticket.claim.ticket.attendeeEmail, ticket);
      if (ticket.claim.ticket.ticketName !== "GA") continue;
      let ticketPacks = eventsMap.get(ticket.claim.ticket.eventName);
      if (!ticketPacks) {
        ticketPacks = [];
        eventsMap.set(ticket.claim.ticket.eventName, ticketPacks);
      }
      if (ticket.type === PODTicketPCDTypeName) {
        const relatedEddesaTicketPackIdx = ticketPacks.findIndex(
          (pack) =>
            pack.attendeeEmail === ticket.claim.ticket.attendeeEmail &&
            pack.packType === EdDSATicketPCDTypeName
        );
        if (relatedEddesaTicketPackIdx >= 0)
          ticketPacks.splice(relatedEddesaTicketPackIdx, 1);
      }
      ticketPacks.push({
        eventTicket: ticket,
        eventId: ticket.claim.ticket.eventId,
        addOns: [],
        attendeeEmail: ticket.claim.ticket.attendeeEmail,
        packType: ticket.type as TicketTypeName
      });
    }
    for (const ticket of tickets) {
      if (ticket.claim.ticket.ticketName === "GA") continue;
      const ticketPacks = eventsMap.get(ticket.claim.ticket.eventName);
      if (!ticketPacks) continue;
      const pack = ticketPacks.find(
        (pack) =>
          pack.attendeeEmail === ticket.claim.ticket.attendeeEmail &&
          pack.packType === ticket.type
      );

      if (!pack) continue;
      pack.addOns.push(ticket);
    }
    return Array.from(eventsMap.entries());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketsTrigger]);
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
  transition: left 0.2s cubic-bezier(0.25, 0.8, 0.5, 1);
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

const Container = styled.div<{ elWidth: number; height?: number }>`
  margin-top: 20px;
  width: 100%;
  overflow: hidden;
  position: relative;
  height: ${({ height }): string => `${height}px` ?? "100%"};
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
  ${({ disabled }): FlattenSimpleInterpolation | undefined =>
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
  height: 100%;
  gap: ${TICKET_GAP}px;
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

const calculateElWidth = (
  scrollWidth: number,
  gap: number,
  len: number
): number => {
  return Math.ceil((scrollWidth - gap * (len - 1)) / len);
};

const getEventDetails = (tickets: TicketPack): ITicketData => {
  return tickets.eventTicket.claim.ticket as ITicketData;
};

const EmptyCardContainer = styled.div`
  display: flex;
  height: 302px;
  justify-content: center;
  align-items: center;
  border-radius: 16px;
  background: #e1e1e2;
  /* shadow-inset-black */
  box-shadow: 1px 1px 0px 0px rgba(0, 0, 0, 0.1) inset;
  padding: 0 40px;
`;

const InnerContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
`;

const calcColHeight = (ticketRefs: HTMLDivElement[]): number => {
  const len = ticketRefs.length;
  const allSize = ticketRefs.reduce((acc, ref) => {
    acc += ref.clientHeight;
    return acc;
  }, 0);

  return allSize + len * ANOTHER_GAP;
};

const EmptyCard = (): ReactElement => {
  return (
    <EmptyCardContainer>
      <InnerContainer>
        <Typography fontWeight={800} color="var(--text-tertiary)">
          YOU HAVE NO EVENT PASSES
        </Typography>
        <Typography color="var(--text-tertiary)">
          Make sure you are logged in with the correct email address.
        </Typography>
      </InnerContainer>
    </EmptyCardContainer>
  );
};

export const NewHomeScreen = (): ReactElement => {
  useSyncE2EEStorage();
  const tickets = useTickets();
  const [currentPos, setCurrentPos] = useState(0);
  const [width, setWidth] = useState(0);
  const [width2, setWidth2] = useState(0);
  const [colHeight, setColHeight] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pcdCardScrollRef = useRef<HTMLDivElement>(null);
  const ticketsRef = useRef<Map<string, HTMLDivElement[]>>(new Map());
  const self = useSelf();
  const navigate = useNavigate();

  useEffect(() => {
    if (!self) {
      navigate("/new/login", { replace: true });
    }
  });

  useLayoutEffect(() => {
    if (scrollRef.current) {
      setWidth(
        calculateElWidth(scrollRef.current.scrollWidth, GAP, tickets.length)
      );
    }
    if (pcdCardScrollRef.current) {
      setWidth2(
        calculateElWidth(
          pcdCardScrollRef.current.scrollWidth,
          ANOTHER_GAP,
          tickets.length
        )
      );
    }
    // if (ticketRef.current) {
    //   setTicketHeight(ticketRef.current.clientHeight);
    // }
  }, [setWidth, setWidth2, tickets.length]);

  useEffect(() => {
    const refs = ticketsRef.current.get(tickets[currentPos][0]);
    if (!refs) {
      setColHeight(0);
      return;
    }
    setColHeight(calcColHeight(refs));
  }, [currentPos, tickets]);

  const renderedTickets = useMemo(() => {
    ticketsRef.current = new Map();
    console.log(tickets);
    return tickets.map(([eventName, eventTicketPack]) => {
      return (
        <TicketsContainer
          key={eventTicketPack.map((pack) => pack.eventTicket.id).join("-")}
        >
          {eventTicketPack.map((pack) => {
            return (
              <CardBody
                addOns={
                  pack.addOns.length > 0
                    ? {
                        text: `View ${pack.addOns.length} add-on items`,
                        onClick(): void {}
                      }
                    : undefined
                }
                ref={(ref) => {
                  if (!ref) return;
                  const group = ticketsRef.current.get(eventName);
                  if (!group) {
                    ticketsRef.current.set(eventName, [ref]);
                    return;
                  }
                  group.push(ref);
                }}
                newUI={true}
                pcd={pack.eventTicket}
                isMainIdentity={false}
              />
            );
          })}
        </TicketsContainer>
      );
    });
  }, [tickets]);

  if (!tickets.length)
    return (
      <AppContainer bg="gray">
        <EmptyCard />
        <FloatingMenu />
        <NewModals />
      </AppContainer>
    );
  // return null;
  return (
    <AppContainer bg="gray" noPadding>
      <Container elWidth={width}>
        <Scroller
          gap={GAP}
          offset={(420 - width) / 2}
          ref={scrollRef}
          scrollInPx={positionInPx(currentPos, width, tickets.length - 1, GAP)}
          amount={tickets.length - 1}
        >
          {tickets.map(([eventName, packs], i) => {
            const eventDetails = getEventDetails(packs[0]);
            return (
              <TicketCard
                address={eventName}
                title={eventName}
                ticketDate={new Date(
                  eventDetails.timestampSigned
                ).toDateString()}
                imgSource={eventDetails.imageUrl}
                ticketCount={packs.length}
                cardColor={i % 2 === 0 ? "purple" : "orange"}
              />
            );
          })}
        </Scroller>
        {SHOW_HELPER_LINES && <Line padding={(420 - width) / 2} />}
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
          disabled={currentPos === tickets.length - 1}
          padding={6}
          diameter={28}
          onClick={() => {
            setCurrentPos((old) => {
              if (old === tickets.length - 1) return old;
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
      <Container elWidth={width2} height={colHeight}>
        <Scroller
          gap={ANOTHER_GAP}
          ref={pcdCardScrollRef}
          scrollInPx={positionInPx(
            currentPos,
            width2,
            tickets.length,
            ANOTHER_GAP
          )}
          offset={(420 - width2) / 2}
          amount={tickets.length - 1}
        >
          {renderedTickets}
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
