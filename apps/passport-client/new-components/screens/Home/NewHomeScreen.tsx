/* eslint-disable prettier/prettier */
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from "@heroicons/react/16/solid";
import {
  EdDSATicketPCDTypeName,
  ITicketData,
  isEdDSATicketPCD
} from "@pcd/eddsa-ticket-pcd";
import { isEmailPCD } from "@pcd/email-pcd";
import {
  PCDGetRequest,
  requestGenericIssuanceTicketPreviews
} from "@pcd/passport-interface";
import { Spacer } from "@pcd/passport-ui";
import { PCD } from "@pcd/pcd-types";
import { isPODTicketPCD } from "@pcd/pod-ticket-pcd";
import { isSemaphoreIdentityPCD } from "@pcd/semaphore-identity-pcd";
import { uniqWith } from "lodash";
import {
  ReactElement,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from "react";
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams
} from "react-router-dom";
import SwipableViews from "react-swipeable-views";
import styled, {
  FlattenSimpleInterpolation,
  css,
  keyframes
} from "styled-components";
import { ZappButton } from "../../../components/screens/ZappScreens/ZappButton";
import { ZappButtonsContainer } from "../../../components/screens/ZappScreens/ZappButtonsContainer";
import { ZappFullScreen } from "../../../components/screens/ZappScreens/ZappFullScreen";
import { ZappScreen } from "../../../components/screens/ZappScreens/ZappScreen";
import { AppContainer } from "../../../components/shared/AppContainer";
import { CardBody } from "../../../components/shared/PCDCard";
import { appConfig } from "../../../src/appConfig";
import {
  useDispatch,
  useIsSyncSettled,
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
import { PodsCollectionList } from "../../shared/Modals/PodsCollectionBottomModal";
import { NewLoader } from "../../shared/NewLoader";
import { SwipeViewContainer } from "../../shared/SwipeViewContainer";
import { TicketCard, TicketCardHeight } from "../../shared/TicketCard";
import { Typography } from "../../shared/Typography";
import {
  hideScrollCSS,
  isMobile,
  replaceDotWithSlash,
  useOrientation
} from "../../shared/utils";
import { AddOnsModal } from "./AddOnModal";
import { TicketPack, TicketType, TicketTypeName } from "./types";
import { appConfig } from "../../../src/appConfig";

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

const disabledCSS = css`
  cursor: not-allowed;
  opacity: 0.2;
  pointer-events: none;
`;

export const PageCircleButton = styled.button<{
  disabled: boolean;
}>`
  width: 40px;
  height: 32px;
  cursor: pointer;
  border-radius: 200px;
  border: 2px solid #ffffff;
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
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
const EmptyCardContainer = styled.div<{ longVersion: boolean }>`
  display: flex;
  height: ${({ longVersion }): string =>
    longVersion ? "min(80vh, 549px)" : EMPTY_CARD_CONTAINER_HEIGHT + "px"};
  justify-content: center;
  align-items: center;
  border-radius: 16px;
  background: #e1e1e2;
  /* shadow-inset-black */
  box-shadow: 1px 1px 0px 0px rgba(0, 0, 0, 0.1) inset;
  padding: 0 40px;
  width: 100%;
`;

const InnerContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 10px;
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
  padding-top: 24px;

  box-shadow: 0px 1px 2px 0px rgba(0, 0, 0, 0.05);
  position: relative;

  ${hideScrollCSS}
`;
const OuterContainer = styled.div`
  display: flex;
  gap: 24px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  width: 100%;
  position: relative;
`;

const anim = keyframes`
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0) translateX(-10px);
  }
  40% {
    transform: translateY(10px) translateX(-10px);
  }
  60% {
    transform: translateY(5px) translateX(-10px);
  }
`;
const ScrollIndicatorContainer = styled.div`
  position: absolute;
  bottom: 2%;
  left: 50%;
  transform: translateX(-10px);
  z-index: 2;
  display: flex;
  flex-direction: column;
  opacity: 0.3;

  animation: ${anim} 1.5s infinite;

  transition: opacity 0.5s ease;
`;

const Bar = styled.div`
  height: 36px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.05);
  box-shadow: 1px 1px 0px 0px rgba(0, 0, 0, 0.1) inset;
  width: 180px;
`;

const BarsContainer = styled.div`
  display: flex;
  flex-direction: column;
  padding: 10px 48px 10px 48px;
  width: 100%;
  gap: 5px;
  margin-bottom: 20px;
`;

export const ScrollIndicator = (): ReactElement => {
  return (
    <ScrollIndicatorContainer>
      <ChevronDownIcon color="var(--text-tertiary)" width={30} height={30} />
      <ChevronDownIcon
        color="var(--text-tertiary)"
        width={30}
        height={30}
        style={{ marginTop: -20 }}
      />
    </ScrollIndicatorContainer>
  );
};

const NoUpcomingEventsState = ({
  isLandscape
}: {
  isLandscape: boolean;
}): ReactElement => {
  const dispatch = useDispatch();
  const pods = usePCDCollection();
  const timer = useRef<NodeJS.Timeout>();
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  const [expandedGroupsIds, setExpandedGroupsIds] = useState<
    Record<string, boolean>
  >({});
  const [params] = useSearchParams();
  const listContainerRef = useRef<HTMLDivElement>(null);

  // New function to check scrollability
  const checkScrollability = (): void => {
    if (listContainerRef.current) {
      const scrollable =
        listContainerRef.current.scrollHeight >
        listContainerRef.current.clientHeight;
      setShowScrollIndicator(scrollable);
    }
  };

  // Check scrollability on mount and when pods change
  useEffect(() => {
    checkScrollability();
  }, [pods]);

  const noPods =
    pods
      .getAll()
      .filter((pcd) => !isEmailPCD(pcd) && !isSemaphoreIdentityPCD(pcd))
      .length === 0;

  useLayoutEffect(() => {
    // Restore scroll position when list is shown again
    (async (): Promise<void> => {
      if (listContainerRef.current) {
        const folder = params.get("folder");
        // checks if url contains folder route, and if so, scrolls to it
        if (folder) {
          const decodedFolderId = replaceDotWithSlash(decodeURI(folder));
          const folderContainer = document.getElementById(decodedFolderId);
          setExpandedGroupsIds((old) => {
            console.log(old);
            return {
              ...old,
              [decodedFolderId]: true
            };
          });
          await nextFrame();
          if (folderContainer) {
            console.log(folderContainer.scrollTop);
            listContainerRef.current.scroll({ top: folderContainer.offsetTop });
          }
        }
      }
    })();
    // Check scrollability after layout changes
    checkScrollability();
  }, [noPods, params, setExpandedGroupsIds]);

  return (
    <OuterContainer>
      <EmptyCardContainer longVersion={noPods}>
        <InnerContainer>
          {noPods && (
            <BarsContainer>
              <Bar />
              <Bar />
              <Bar />
              <Bar />
              <Bar />
            </BarsContainer>
          )}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <Typography
              fontSize={20}
              color="var(--text-primary)"
              fontWeight={800}
            >
              NO UPCOMING EVENTS
            </Typography>
            <Typography>
              Don't see your ticket?{" "}
              <a
                style={{ fontWeight: 500 }}
                onClick={() => {
                  dispatch({
                    type: "set-bottom-modal",
                    modal: {
                      modalType: "help-modal"
                    }
                  });
                }}
              >
                Learn more
              </a>
            </Typography>
          </div>
        </InnerContainer>
      </EmptyCardContainer>
      {isLandscape ||
        (!noPods && (
          <ListContainer
            ref={listContainerRef}
            onScroll={(e) => {
              const scrollTop = e.currentTarget.scrollTop;
              console.log(scrollTop);
              if (scrollTop === 0) {
                // start timer
                const id = setTimeout(() => {
                  setShowScrollIndicator(true);
                }, 2000);
                timer.current = id;
              } else {
                setShowScrollIndicator(false);

                // clearing timer on scroll so it won't flash to the user mid scroll
                if (timer.current) {
                  clearTimeout(timer.current);
                  timer.current = undefined;
                }
              }
            }}
          >
            <PodsCollectionList
              onPodClick={(pcd) => {
                dispatch({
                  type: "set-bottom-modal",
                  modal: { modalType: "pods-collection", activePod: pcd }
                });
              }}
              style={{ padding: "0 20px 24px" }}
              expandedGroupsIds={expandedGroupsIds}
              setExpandedGroupsIds={setExpandedGroupsIds}
            />
            {showScrollIndicator && <ScrollIndicator />}
          </ListContainer>
        ))}
    </OuterContainer>
  );
};

export const NewHomeScreen = (): ReactElement => {
  useSyncE2EEStorage();
  const tickets = useTickets();
  const collection = usePCDCollection();
  const [currentPos, setCurrentPos] = useState(0);
  const dispatch = useDispatch();
  const ticketsRef = useRef<Map<string, HTMLDivElement[]>>(new Map());
  const scrollTo = useScrollTo();
  const windowWidth = useWindowWidth();
  const self = useSelf();
  const navigate = useNavigate();
  const isLoadedPCDs = useIsSyncSettled();
  const [params, setParams] = useSearchParams();
  const [zappUrl, setZappUrl] = useState("");
  const [holding, setHolding] = useState(false);
  const isInvalidUser = useUserForcedToLogout();
  const location = useLocation();
  const regularParams = useParams();
  const noPods =
    collection
      .getAll()
      .filter((pcd) => !isEmailPCD(pcd) && !isSemaphoreIdentityPCD(pcd))
      .length === 0;

  const orientation = useOrientation();
  const isLandscape =
    isMobile &&
    (orientation.type === "landscape-primary" ||
      orientation.type === "landscape-secondary");
  useEffect(() => {
    if (!self && !location.pathname.includes("one-click-preview")) {
      navigate("/login", { replace: true });
    }
  });
  const showPodsList = tickets.length === 0 && !isLandscape && !noPods;

  useLayoutEffect(() => {
    // if we haven't loaded all pcds yet, dont process the prove request
    if (!isLoadedPCDs) return;

    const maybeExistingFolder = params.get("folder");
    if (maybeExistingFolder) {
      // Check if folder matches any zapp name (case insensitive)
      const zappEntry = Object.entries(appConfig.embeddedZapps).find(
        ([key]) => key.toLowerCase() === maybeExistingFolder.toLowerCase()
      );
      if (zappEntry) {
        setZappUrl(zappEntry[1]);
        return;
      }

      // Original folder check logic
      if (
        collection
          .getAllFolderNames()
          .includes(replaceDotWithSlash(decodeURI(maybeExistingFolder)))
      ) {
        if (!showPodsList) {
          dispatch({
            type: "set-bottom-modal",
            modal: { modalType: "pods-collection" }
          });
        }
        return;
      }
    }

    if (location.pathname.includes("prove")) {
      const params = new URLSearchParams(location.search);
      const request = JSON.parse(
        params.get("request") ?? "{}"
      ) as PCDGetRequest;
      dispatch({
        type: "set-bottom-modal",
        modal: { request, modalType: "prove" }
      });
      console.log(request);
      return;
    }
    if (params.size > 0) setParams("");
  }, [
    regularParams,
    params,
    collection,
    setParams,
    isLoadedPCDs,
    location,
    dispatch,
    showPodsList,
    setZappUrl
  ]);
  useLayoutEffect(() => {
    const test = async (): Promise<void> => {
      if (location.pathname.includes("one-click-preview")) {
        const { email, code, targetFolder, pipelineId, serverUrl } =
          regularParams;
        if (!email || !code) return;

        if (self) {
          if (!self.emails?.includes(email as string)) {
            alert(
              `You are already logged in as ${
                self.emails.length === 1
                  ? self.emails?.[0]
                  : "an account that owns the following email addresses: " +
                    self.emails.join(", ")
              }. Please log out and try navigating to the link again.`
            );
            window.location.hash = "#/";
            return;
          }
        }
        const previewRes = await requestGenericIssuanceTicketPreviews(
          serverUrl ?? appConfig.zupassServer,
          email,
          code,
          pipelineId
        );

        await dispatch({
          type: "one-click-login",
          email,
          code,
          targetFolder
        });

        if(previewRes.success){
          dispatch({
            type: "scroll-to-ticket",
            scrollTo: {
              attendee: previewRes.value.tickets[0].attendeeEmail,
              eventId: previewRes.value.tickets[0].eventId
            }
          });
        }
      }
    };
    test();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  if (zappUrl) {
    return (
      <ZappFullScreen
        url={zappUrl}
        onReturn={() => {
          setZappUrl("");
          params.delete("folder");
          setParams(params);
        }}
      />
    );
  }

  return (
    <AppContainer
      bg="gray"
      noPadding={tickets.length > 0}
      fullscreen={tickets.length > 0}
    >
      {(!tickets.length || isInvalidUser) && (
        <NoUpcomingEventsState isLandscape={isLandscape} />
      )}
      {tickets.length > 0 && (
        <>
          <SwipeViewContainer
            onMouseDown={() => {
              setHolding(true);
            }}
            onMouseUp={() => {
              setHolding(false);
            }}
            onMouseLeave={() => {
              setHolding(false);
            }}
            style={{
              cursor: holding ? "grabbing" : "grab"
            }}
          >
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
                    <ZappsAndTicketsContainer>
                      {Object.keys(appConfig.embeddedZapps).length && (
                        <ZappButtonsContainer>
                          {Object.entries(appConfig.embeddedZapps).map(
                            ([zappName, url]) => (
                              <ZappButton
                                key={zappName}
                                onClick={() => {
                                  setZappUrl(url);
                                  setParams({ folder: zappName });
                                }}
                              >
                                <ZappScreen
                                  url={new URL("button", url).toString()}
                                />
                              </ZappButton>
                            )
                          )}
                        </ZappButtonsContainer>
                      )}
                      <TicketsContainer
                        $width={cardWidth}
                        key={packs.map((pack) => pack.eventTicket.id).join("-")}
                      >
                        {packs.map((pack) => {
                          return (
                            <CardBody
                              showDownloadButton={true}
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
                    </ZappsAndTicketsContainer>
                  </Container>
                );
              })}
            </_SwipableViews>
            {tickets.length > 1 && (
              <ButtonsContainer>
                <PageCircleButton
                  disabled={currentPos === 0}
                  onClick={() => {
                    setCurrentPos((old) => {
                      if (old === 0) return old;
                      return old - 1;
                    });
                  }}
                >
                  <ChevronLeftIcon
                    width={24}
                    height={24}
                    color="var(--text-tertiary)"
                  />
                </PageCircleButton>
                <Typography
                  fontSize={14}
                  color="#8B94AC"
                  fontWeight={500}
                  family="Rubik"
                  style={{ display: "flex", alignItems: "center" }}
                >
                  {currentPos + 1} OF {tickets.length}
                </Typography>
                <PageCircleButton
                  disabled={currentPos === tickets.length - 1}
                  onClick={() => {
                    setCurrentPos((old) => {
                      if (old === tickets.length - 1) return old;
                      return old + 1;
                    });
                  }}
                >
                  <ChevronRightIcon
                    width={24}
                    height={24}
                    color="var(--text-tertiary)"
                  />
                </PageCircleButton>
              </ButtonsContainer>
            )}
          </SwipeViewContainer>
        </>
      )}
      {!(showPodsList || noPods) && <Spacer h={96} />}
      <FloatingMenu onlySettings={showPodsList || noPods} />
      <AddOnsModal />
      <NewModals />
    </AppContainer>
  );
};

export const ZappsAndTicketsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;
