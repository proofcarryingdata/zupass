import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/16/solid";
import {
  EdDSATicketPCDTypeName,
  ITicketData,
  isEdDSATicketPCD
} from "@pcd/eddsa-ticket-pcd";
import { Spacer } from "@pcd/passport-ui";
import { PCD } from "@pcd/pcd-types";
import { isPODTicketPCD } from "@pcd/pod-ticket-pcd";
import { uniqWith } from "lodash";
import { ReactElement, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import SwipableViews from "react-swipeable-views";
import styled, { FlattenSimpleInterpolation, css } from "styled-components";
import { AppContainer } from "../../../components/shared/AppContainer";
import { CardBody } from "../../../components/shared/PCDCard";
import {
  useDispatch,
  useLoadedIssuedPCDs,
  usePCDCollection,
  usePCDs,
  useScrollTo,
  useSelf,
  useUserForcedToLogout
} from "../../../src/appHooks";
import { MAX_WIDTH_SCREEN } from "../../../src/sharedConstants";
import { useSyncE2EEStorage } from "../../../src/useSyncE2EEStorage";
import { nextFrame } from "../../../src/util";
import { FloatingMenu } from "../../shared/FloatingMenu";
import { NewModals } from "../../shared/Modals/NewModals";
import { NewLoader } from "../../shared/NewLoader";
import { TicketCard, TicketCardHeight } from "../../shared/TicketCard";
import { Typography } from "../../shared/Typography";
import { isMobile, useOrientation } from "../../shared/utils";
import { AddOnsModal } from "./AddOnModal";
import { TicketPack, TicketType, TicketTypeName } from "./types";
import { PodsCollectionList } from "../../shared/Modals/PodsCollectionBottomModal";
import { isEmailPCD } from "@pcd/email-pcd";
import { isSemaphoreIdentityPCD } from "@pcd/semaphore-identity-pcd";

// @ts-expect-error TMP fix for bad lib
const _SwipableViews = SwipableViews.default;

const SCREEN_HORIZONTAL_PADDING = 20;
const TICKET_VERTICAL_GAP = 20;
const BUTTONS_CONTAINER_HEIGHT = 40;
const CARD_GAP = isMobile ? 8 : SCREEN_HORIZONTAL_PADDING * 2;

const isEventTicketPCD = (pcd: PCD<unknown, unknown>): pcd is TicketType => {
  return (
    (isEdDSATicketPCD(pcd) || isPODTicketPCD(pcd)) &&
    !!pcd.claim.ticket.eventStartDate
  );
};

const useTickets = (): Array<[string, TicketPack[]]> => {
  const allPCDs = usePCDs();
  const tickets = allPCDs.filter(isEventTicketPCD).reverse();
  //fitering out overlapping eddsa tickets
  const uniqTickets = uniqWith(tickets, (t1, t2) => {
    return (
      t1.claim.ticket.eventId === t2.claim.ticket.eventId &&
      t1.claim.ticket.attendeeEmail === t2.claim.ticket.attendeeEmail &&
      t1.type === EdDSATicketPCDTypeName
    );
  }).sort((t1, t2) => {
    // if one of the tickets doesnt have a date, immidiatly retrun the other one as the bigger one
    if (!t1.claim.ticket.eventStartDate) return -1;
    if (!t2.claim.ticket.eventStartDate) return 1;

    // parse the date
    const date1 = Date.parse(t1.claim.ticket.eventStartDate);
    const date2 = Date.parse(t2.claim.ticket.eventStartDate);
    const now = Date.now();

    const timeToDate1 = date1 - now;
    const timeToDate2 = date2 - now;
    // if one of the dates passed its due date, immidately return the other one
    if (timeToDate1 < 0) return -1;
    if (timeToDate2 < 0) return 1;

    // return which date is closer to the current time
    return timeToDate1 - timeToDate2;
  });

  //  This hook is building "ticket packs"
  //  ticket pack - main ticket and all its ticket addons, under the same event and attendee
  return useMemo(() => {
    const eventsMap = new Map<string, TicketPack[]>();
    // creating the initial ticket packs for events - only main event ticket
    for (const ticket of uniqTickets) {
      if (ticket.claim.ticket.isAddOn) continue;
      let ticketPacks = eventsMap.get(ticket.claim.ticket.eventId);
      if (!ticketPacks) {
        ticketPacks = [];
        eventsMap.set(ticket.claim.ticket.eventId, ticketPacks);
      }
      ticketPacks.push({
        eventTicket: ticket,
        eventName: ticket.claim.ticket.eventName,
        addOns: [],
        attendeeEmail: ticket.claim.ticket.attendeeEmail,
        packType: ticket.type as TicketTypeName
      });
    }
    // adding the addons to their respective ticket pack
    for (const ticket of uniqTickets) {
      if (!ticket.claim.ticket.isAddOn) continue;
      const ticketPacks = eventsMap.get(ticket.claim.ticket.eventId);
      if (!ticketPacks) continue;
      const pack = ticketPacks.find(
        (pack) => pack.attendeeEmail === ticket.claim.ticket.attendeeEmail
      );

      if (!pack) continue;
      pack.addOns.push(ticket);
    }
    return Array.from(eventsMap.entries());
  }, [uniqTickets]);
};

const Container = styled.div<{ ticketsAmount: number }>`
  display: flex;
  flex-direction: column;
  margin-top: 20px;
  width: fit-content;
  gap: ${({ ticketsAmount }): number =>
    ticketsAmount > 1 ? 40 + BUTTONS_CONTAINER_HEIGHT : 20}px;
`;

const SwipeViewContainer = styled.div`
  position: relative;
  width: min(100vw, 420px);
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
  position: absolute;
  gap: 12px;
  top: ${TicketCardHeight +
  BUTTONS_CONTAINER_HEIGHT / 2 +
  20}px; /* 20 px gap above card */
  left: 50%;
  transform: translateX(-50%);
`;

const TicketsContainer = styled.div<{ $width: number }>`
  width: ${({ $width }): number => $width}px;
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: ${TICKET_VERTICAL_GAP}px;
`;

const getEventDetails = (tickets: TicketPack): ITicketData => {
  return tickets.eventTicket.claim.ticket as ITicketData;
};
const EMPTY_CARD_CONTAINER_HEIGHT = 220;
const EmptyCardContainer = styled.div`
  display: flex;
  height: ${EMPTY_CARD_CONTAINER_HEIGHT}px;
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

const useWindowWidth = (): number => {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  useEffect(() => {
    const onResize = (): void => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return windowWidth;
};

const LoadingScreenContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin: auto 0;
`;

const ListContainer = styled.div`
  width: 100%;
  max-height: calc(100vh - ${EMPTY_CARD_CONTAINER_HEIGHT + 64}px);
  overflow-y: scroll;
  border-radius: 20px;
  border: 2px solid var(--text-white);
  background: rgba(255, 255, 255, 0.8);

  box-shadow: 0px 1px 2px 0px rgba(0, 0, 0, 0.05);
`;
const OuterContainer = styled.div`
  display: flex;
  gap: 24px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  width: 100%;
`;
const NoUpcomingEventsState = (): ReactElement => {
  const dispatch = useDispatch();
  const pods = usePCDCollection();
  const orientation = useOrientation();
  const isLandscape =
    orientation.type === "landscape-primary" ||
    orientation.type === "landscape-secondary";
  return (
    <OuterContainer>
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
      {isLandscape ||
        (pods
          .getAll()
          .filter((pcd) => !isEmailPCD(pcd) && !isSemaphoreIdentityPCD(pcd))
          .length > 0 && (
          <ListContainer>
            <PodsCollectionList
              onPodClick={(pcd) => {
                dispatch({
                  type: "set-bottom-modal",
                  modal: { modalType: "pods-collection", activePod: pcd }
                });
              }}
              style={{ padding: "20px 24px" }}
            />
          </ListContainer>
        ))}
    </OuterContainer>
  );
};

export const NewHomeScreen = (): ReactElement => {
  useSyncE2EEStorage();
  const tickets = useTickets();
  const [currentPos, setCurrentPos] = useState(0);
  const dispatch = useDispatch();
  const ticketsRef = useRef<Map<string, HTMLDivElement[]>>(new Map());
  const scrollTo = useScrollTo();
  const windowWidth = useWindowWidth();
  const self = useSelf();
  const navigate = useNavigate();
  const isLoadedPCDs = useLoadedIssuedPCDs();

  const isInvalidUser = useUserForcedToLogout();
  useEffect(() => {
    if (!self) {
      navigate("/login", { replace: true });
    }
  });

  useEffect(() => {
    if (scrollTo && isLoadedPCDs && tickets.length > 0) {
      // getting the pos of the event card
      const eventPos = tickets.findIndex(
        (pack) => pack[0] === scrollTo.eventId
      );
      if (eventPos < 0) return;
      // scrolling to it and re-running the hook
      if (eventPos !== currentPos) {
        setCurrentPos(eventPos);
        return;
      }
      (async (): Promise<void> => {
        // making sure we let the tickets render before we fetch them from the dom
        await nextFrame();
        const elToScroll = document.getElementById(
          scrollTo.eventId + scrollTo.attendee
        );
        window.scroll({
          top: elToScroll?.offsetTop,
          left: elToScroll?.offsetLeft
        });
        dispatch({ type: "scroll-to-ticket", scrollTo: undefined });
      })();
    }
  }, [dispatch, scrollTo, currentPos, setCurrentPos, tickets, isLoadedPCDs]);

  const cardWidth =
    (windowWidth > MAX_WIDTH_SCREEN ? MAX_WIDTH_SCREEN : windowWidth) -
    SCREEN_HORIZONTAL_PADDING * 2;

  // if not loaded pcds yet and the user session is valid
  if (!isLoadedPCDs && !isInvalidUser) {
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

  // if the user is invalid we show empty card and trigger a session invalid modal
  return (
    <AppContainer
      bg="gray"
      noPadding={tickets.length > 0}
      fullscreen={tickets.length > 0}
    >
      {(!tickets.length || isInvalidUser) && <NoUpcomingEventsState />}
      {tickets.length > 0 && (
        <>
          <SwipeViewContainer>
            <_SwipableViews
              style={{
                padding: `0 ${SCREEN_HORIZONTAL_PADDING - CARD_GAP / 2}px`
              }}
              slideStyle={{
                padding: `0 ${CARD_GAP / 2}px`
              }}
              resistance={true}
              index={currentPos}
              onChangeIndex={(e: number) => {
                setCurrentPos(e);
              }}
              enableMouseEvents
            >
              {tickets.map(([eventId, packs], i) => {
                const eventDetails = getEventDetails(packs[0]);
                return (
                  <Container key={eventId} ticketsAmount={tickets.length}>
                    <TicketCard
                      ticketWidth={cardWidth}
                      address={eventDetails.eventLocation}
                      title={eventDetails.eventName}
                      ticketDate={
                        eventDetails.eventStartDate
                          ? new Date(eventDetails.eventStartDate).toDateString()
                          : undefined
                      }
                      imgSource={eventDetails.imageUrl}
                      ticketCount={packs.length}
                      cardColor={i % 2 === 0 ? "purple" : "orange"}
                    />
                    <TicketsContainer
                      $width={cardWidth}
                      key={packs.map((pack) => pack.eventTicket.id).join("-")}
                    >
                      {packs.map((pack) => {
                        return (
                          <CardBody
                            key={pack.eventName}
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
                              const group = ticketsRef.current.get(eventId);
                              if (!group) {
                                ticketsRef.current.set(eventId, [ref]);
                                return;
                              }
                              group.push(ref);
                            }}
                            pcd={pack.eventTicket}
                            isMainIdentity={false}
                          />
                        );
                      })}
                    </TicketsContainer>
                  </Container>
                );
              })}
            </_SwipableViews>
            {tickets.length > 1 && (
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
            )}
          </SwipeViewContainer>
        </>
      )}
      <Spacer h={96} />
      <FloatingMenu />
      <AddOnsModal />
      <NewModals />
    </AppContainer>
  );
};
