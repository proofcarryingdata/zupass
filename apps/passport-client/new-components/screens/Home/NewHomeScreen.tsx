import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/solid";
import {
  EdDSATicketPCDTypeName,
  ITicketData,
  isEdDSATicketPCD
} from "@pcd/eddsa-ticket-pcd";
import { Spacer } from "@pcd/passport-ui";
import { PCD } from "@pcd/pcd-types";
import { PODTicketPCDTypeName, isPODTicketPCD } from "@pcd/pod-ticket-pcd";
import { ReactElement, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import SwipableViews from "react-swipeable-views";
import styled, { FlattenSimpleInterpolation, css } from "styled-components";
import { AppContainer } from "../../../components/shared/AppContainer";
import { CardBody } from "../../../components/shared/PCDCard";
import {
  useDispatch,
  useLoadedIssuedPCDs,
  usePCDs,
  useSelf,
  useUserForcedToLogout
} from "../../../src/appHooks";
import { MAX_WIDTH_SCREEN } from "../../../src/sharedConstants";
import { useSyncE2EEStorage } from "../../../src/useSyncE2EEStorage";
import { FloatingMenu } from "../../shared/FloatingMenu";
import { NewModals } from "../../shared/Modals/NewModals";
import { NewLoader } from "../../shared/NewLoader";
import { TicketCard, TicketCardHeight } from "../../shared/TicketCard";
import { Typography } from "../../shared/Typography";
import { AddOnsModal } from "./AddOnModal";
import { TicketPack, TicketType, TicketTypeName } from "./types";

const CARD_GAP = 8;
const TICKET_VERTICAL_GAP = 20;
const SCREEN_HORIZONTAL_PADDING = 20;
const BUTTONS_CONTAINER_HEIGHT = 40;

const isEventTicketPCD = (pcd: PCD<unknown, unknown>): pcd is TicketType => {
  // TODO: fetch the pods type as well and prioritize it if theres a conflict.
  return isEdDSATicketPCD(pcd) || isPODTicketPCD(pcd);
};

const useTickets = (): Array<[string, TicketPack[]]> => {
  const allPCDs = usePCDs();
  const tickets = allPCDs.filter(isEventTicketPCD);
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
  }, [tickets]);
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
  const dispatch = useDispatch();
  const ticketsRef = useRef<Map<string, HTMLDivElement[]>>(new Map());
  const windowWidth = useWindowWidth();
  const self = useSelf();
  const navigate = useNavigate();
  const isLoadedPCDs = useLoadedIssuedPCDs();

  const isInvalidUser = useUserForcedToLogout();
  useEffect(() => {
    if (!self) {
      navigate("/new/login", { replace: true });
    }
  });

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
      {(!tickets.length || isInvalidUser) && <EmptyCard />}
      {tickets.length > 0 && (
        <>
          <SwipeViewContainer>
            <SwipableViews
              style={{
                padding: `0 ${SCREEN_HORIZONTAL_PADDING - CARD_GAP / 2}px`
              }}
              slideStyle={{
                padding: `0 ${CARD_GAP / 2}px`
              }}
              resistance={true}
              index={currentPos}
              onChangeIndex={(e) => {
                setCurrentPos(e);
              }}
            >
              {tickets.map(([eventName, packs], i) => {
                const eventDetails = getEventDetails(packs[0]);
                return (
                  <Container key={eventName} ticketsAmount={tickets.length}>
                    <TicketCard
                      ticketWidth={cardWidth}
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
                    <TicketsContainer
                      $width={cardWidth}
                      key={packs.map((pack) => pack.eventTicket.id).join("-")}
                    >
                      {packs.map((pack) => {
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
                  </Container>
                );
              })}
            </SwipableViews>
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
