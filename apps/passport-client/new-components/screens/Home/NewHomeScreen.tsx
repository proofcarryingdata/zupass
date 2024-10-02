import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/solid";
import {
  EdDSATicketPCDTypeName,
  ITicketData,
  isEdDSATicketPCD
} from "@pcd/eddsa-ticket-pcd";
import { Spacer } from "@pcd/passport-ui";
import { PCD } from "@pcd/pcd-types";
import { PODTicketPCDTypeName, isPODTicketPCD } from "@pcd/pod-ticket-pcd";
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
import {
  useDispatch,
  useLoadedIssuedPCDs,
  usePCDs,
  useSelf
} from "../../../src/appHooks";
import { useSyncE2EEStorage } from "../../../src/useSyncE2EEStorage";
import { FloatingMenu } from "../../shared/FloatingMenu";
import { NewModals } from "../../shared/Modals/NewModals";
import { TicketCard } from "../../shared/TicketCard";
import { Typography } from "../../shared/Typography";
import { TicketPack, TicketType, TicketTypeName } from "./types";
import { AddOnsModal } from "./AddOnModal";
import { MAX_WIDTH_SCREEN } from "../../../src/sharedConstants";
import { NewLoader } from "../../shared/NewLoader";

const EVENT_GAP = 4;
const EVENT_GAP_DESKTOP = 40;
const TICKETS_HORIZONTAL_GAP = 40;
const SHOW_HELPER_LINES = false;
const TICKET_VERTICAL_GAP = 20;

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
  display: inline-flex;
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
  gap: ${TICKET_VERTICAL_GAP}px;
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

const calculateTicketsColumnHeight = (ticketRefs: HTMLDivElement[]): number => {
  const len = ticketRefs.length;
  // we have to calculate it per ticket column since different tickets can have different heights (if you have addons vs you dont)
  const sumOfTicketsHeight = ticketRefs.reduce((acc, ref) => {
    acc += ref.clientHeight;
    return acc;
  }, 0);

  return sumOfTicketsHeight + len * TICKETS_HORIZONTAL_GAP;
};

const useWindowWidth = (): number => {
  const [windoWidth, setWindowWidth] = useState(window.innerWidth);
  useEffect(() => {
    const onResize = (): void => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return windoWidth;
};

const LoadingScreenContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin: auto 0;
`;

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
  const [eventCardWidth, setEventCardWidth] = useState(0);
  const [ticketCardWidth, setTicketCardWidth] = useState(0);
  const [ticketsColumnHeight, setTicketsColumnHeight] = useState(0);
  const dispatch = useDispatch();
  const scrollRef = useRef<HTMLDivElement>(null);
  const pcdCardScrollRef = useRef<HTMLDivElement>(null);
  const ticketsRef = useRef<Map<string, HTMLDivElement[]>>(new Map());
  const windowWidth = useWindowWidth();
  const self = useSelf();
  const navigate = useNavigate();
  const isLoadedPCDs = useLoadedIssuedPCDs();

  useEffect(() => {
    if (!self) {
      navigate("/new/login", { replace: true });
    }
  });

  // variable event gap for mobile view and desktop view
  const eventGap =
    windowWidth > MAX_WIDTH_SCREEN ? EVENT_GAP_DESKTOP : EVENT_GAP;
  console.log(eventCardWidth);
  useLayoutEffect(() => {
    console.log(scrollRef.current, pcdCardScrollRef.current);
    if (scrollRef.current) {
      setEventCardWidth(
        calculateElWidth(
          scrollRef.current.scrollWidth,
          eventGap,
          tickets.length
        )
      );
    }
    if (pcdCardScrollRef.current) {
      setTicketCardWidth(
        calculateElWidth(
          pcdCardScrollRef.current.scrollWidth,
          TICKETS_HORIZONTAL_GAP,
          tickets.length
        )
      );
    }
  }, [
    eventGap,
    setEventCardWidth,
    setTicketCardWidth,
    tickets.length,
    isLoadedPCDs
  ]);

  useEffect(() => {
    if (tickets[currentPos]) {
      const refs = ticketsRef.current.get(tickets[currentPos][0]);
      if (!refs) {
        setTicketsColumnHeight(0);
        return;
      }
      setTicketsColumnHeight(calculateTicketsColumnHeight(refs));
    }
  }, [currentPos, tickets, isLoadedPCDs]);

  const renderedTickets = useMemo(() => {
    ticketsRef.current = new Map();
    return tickets.map(([eventName, eventTicketPack]) => {
      return (
        <TicketsContainer
          key={eventTicketPack.map((pack) => pack.eventTicket.id).join("-")}
        >
          {eventTicketPack.map((pack) => {
            return (
              <CardBody
                key={pack.eventId}
                addOns={
                  pack.addOns.length > 0
                    ? {
                        text: `View ${pack.addOns.length} add-on items`,
                        onClick(): void {
                          dispatch({
                            type: "set-bottom-modal",
                            modal: {
                              addOns: pack.addOns,
                              modalType: "ticket-add-ons"
                            }
                          });
                        }
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
  }, [tickets, dispatch]);
  if (!isLoadedPCDs) {
    return (
      <AppContainer fullscreen={true} bg="gray">
        <LoadingScreenContainer>
          <NewLoader columns={5} rows={5} />
          <Typography
            fontSize={18}
            fontWeight={800}
            color="var(--text-tertiary)"
          >
            GENERATING PODS
          </Typography>
        </LoadingScreenContainer>
      </AppContainer>
    );
  }
  if (!tickets.length)
    return (
      <AppContainer bg="gray">
        <EmptyCard />
        <FloatingMenu />
        <NewModals />
      </AppContainer>
    );

  const relativeWindowWidth =
    windowWidth > MAX_WIDTH_SCREEN ? MAX_WIDTH_SCREEN : windowWidth;
  console.log({
    relativeWindowWidth,
    eventCardWidth,
    ticketCardWidth,
    eventGap
  });
  return (
    <AppContainer bg="gray" noPadding fullscreen>
      <Container elWidth={eventCardWidth}>
        <Scroller
          gap={eventGap}
          offset={(relativeWindowWidth - eventCardWidth) / 2}
          ref={scrollRef}
          scrollInPx={positionInPx(
            currentPos,
            eventCardWidth,
            tickets.length - 1,
            eventGap
          )}
          amount={tickets.length - 1}
        >
          {tickets.map(([eventName, packs], i) => {
            const eventDetails = getEventDetails(packs[0]);
            return (
              <TicketCard
                key={eventName}
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
        {SHOW_HELPER_LINES && <Line padding={(420 - eventCardWidth) / 2} />}
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
      <Container elWidth={ticketCardWidth} height={ticketsColumnHeight}>
        <Scroller
          gap={TICKETS_HORIZONTAL_GAP}
          ref={pcdCardScrollRef}
          scrollInPx={positionInPx(
            currentPos,
            ticketCardWidth,
            tickets.length,
            TICKETS_HORIZONTAL_GAP
          )}
          offset={(relativeWindowWidth - ticketCardWidth) / 2}
          amount={tickets.length}
        >
          {renderedTickets}
        </Scroller>
        {SHOW_HELPER_LINES && (
          <Line padding={(relativeWindowWidth - ticketCardWidth) / 2} />
        )}
      </Container>
      <Spacer h={48} />
      <FloatingMenu />
      <NewModals />
      <AddOnsModal />
    </AppContainer>
  );
};
