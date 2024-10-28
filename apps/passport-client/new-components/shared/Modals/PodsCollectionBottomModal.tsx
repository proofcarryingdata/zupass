import { isEdDSAFrogPCD } from "@pcd/eddsa-frog-pcd";
import { isEdDSATicketPCD } from "@pcd/eddsa-ticket-pcd";
import { isEmailPCD } from "@pcd/email-pcd";
import { PCD } from "@pcd/pcd-types";
import {
  getImageUrlEntry,
  getDisplayOptions as getPodDisplayOptions,
  isPODPCD
} from "@pcd/pod-pcd";
import { isPODTicketPCD } from "@pcd/pod-ticket-pcd";
import { isUnknownPCD } from "@pcd/unknown-pcd";
import { isZKEdDSAFrogPCD } from "@pcd/zk-eddsa-frog-pcd";
import intersectionWith from "lodash/intersectionWith";
import {
  ReactElement,
  ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { useSearchParams } from "react-router-dom";
import styled, { CSSProperties } from "styled-components";
import { CardBody } from "../../../components/shared/PCDCard";
import {
  useBottomModal,
  useDispatch,
  usePCDCollection
} from "../../../src/appHooks";
import { ScrollIndicator } from "../../screens/Home/NewHomeScreen";
import { Avatar } from "../Avatar";
import { BottomModal } from "../BottomModal";
import { Button2 } from "../Button";
import { Input2 } from "../Input";
import { GroupType, List } from "../List";
import { Typography } from "../Typography";
import {
  POD_FOLDER_DISPLAY_SEPERATOR,
  replaceDotWithSlash,
  useOrientation,
  hideScrollCSS
} from "../utils";

const getPcdName = (pcd: PCD<unknown, unknown>): string => {
  switch (true) {
    case isEdDSATicketPCD(pcd) || isPODTicketPCD(pcd):
      return pcd.claim.ticket.eventName + " - " + pcd.claim.ticket.ticketName;
    case isEmailPCD(pcd):
      return pcd.claim.emailAddress;
    case isPODPCD(pcd):
      return getPodDisplayOptions(pcd).header ?? pcd.id;
    case isEdDSAFrogPCD(pcd):
      return pcd.claim.data.name;
    case isZKEdDSAFrogPCD(pcd):
      return pcd.claim.partialFrog.name ?? pcd.id;
    case isUnknownPCD(pcd):
    default:
      return pcd.id;
  }
};
const getPCDImage = (pcd: PCD<unknown, unknown>): ReactNode | undefined => {
  switch (true) {
    case isEdDSATicketPCD(pcd) || isPODTicketPCD(pcd):
      return <Avatar imgSrc={pcd.claim.ticket.imageUrl} />;
    case isPODPCD(pcd):
      const imageUrl = getImageUrlEntry(pcd)?.value;
      if (typeof imageUrl === "string") {
        return <Avatar imgSrc={imageUrl} />;
      }
      return undefined;
    case isEdDSAFrogPCD(pcd):
      return <Avatar imgSrc={pcd.claim.data.imageUrl} />;
    case isZKEdDSAFrogPCD(pcd):
      return <Avatar imgSrc={pcd.claim.partialFrog.imageUrl} />;
    case isUnknownPCD(pcd):
    default:
      return undefined;
  }
};

type PodsCollectionListProps = {
  onPodClick?: (pcd: PCD<unknown, unknown>) => void;
  style?: CSSProperties;
  expandedGroupsIds: Record<string, boolean>;
  setExpandedGroupsIds: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
};
export const PodsCollectionList = ({
  onPodClick,
  style,
  expandedGroupsIds,
  setExpandedGroupsIds
}: PodsCollectionListProps): ReactElement => {
  const pcdCollection = usePCDCollection();
  const [searchQuery, setSearchQuery] = useState<string>("");

  const podsCollectionList = useMemo(() => {
    const allPcds = pcdCollection.getAll();
    // If we have the same ticket in both POD and EDSA, we want to show only the POD one
    const podTickets = allPcds.filter(isPODTicketPCD);
    const eddsaTickets = allPcds.filter(isEdDSATicketPCD);
    const badTicketsIds = intersectionWith(eddsaTickets, podTickets, (a, b) => {
      return a.claim.ticket.ticketId === b.claim.ticket.ticketId;
    }).map((ticket) => ticket.id);
    const filteredPcds = allPcds.filter(
      (pcd) =>
        (!isEdDSATicketPCD(pcd) || !badTicketsIds.includes(pcd.id)) &&
        !isEmailPCD(pcd)
    );

    // Group PCDs by folder and create a list of groups with the items inside
    const result: Record<string, GroupType> = {};
    for (const [key, value] of Object.entries(pcdCollection.folders)) {
      if (!result[value]) {
        const isItTheFirstGroup = !Object.keys(result).length;
        const shouldExpandedByDefault =
          isItTheFirstGroup || filteredPcds.length < 20;
        result[value] = {
          title: value.replace(/\//g, ` ${POD_FOLDER_DISPLAY_SEPERATOR} `),
          id: value, // setting the folder path as a key
          children: [],
          expanded:
            expandedGroupsIds[value] === undefined
              ? !!shouldExpandedByDefault
              : !!expandedGroupsIds[value]
        };
      }

      const pcd = filteredPcds.find((pcd) => pcd.id === key);
      if (!pcd) continue;

      result[value].children.push({
        title: getPcdName(pcd),
        key: pcd.id || getPcdName(pcd),
        onClick: () => {
          onPodClick?.(pcd);
        },
        LeftIcon: getPCDImage(pcd)
      });
    }

    return Object.values(result)
      .map((group) => {
        if (!searchQuery) {
          return group;
        }

        if (
          group.title &&
          group.title.toLowerCase().includes(searchQuery.toLowerCase())
        ) {
          return group;
        }

        return {
          ...group,
          expanded: true, // In case we filter by inside the group we want to auto expend it
          children: group.children.filter((pod) =>
            pod.title.toLowerCase().includes(searchQuery.toLowerCase())
          )
        };
      })
      .filter((group) => group.children.length > 0)
      .sort((a, b) => (a.title ?? "").localeCompare(b.title ?? ""));
  }, [pcdCollection, onPodClick, searchQuery, expandedGroupsIds]);

  return (
    <>
      <SearchPodInputContainer>
        <Input2
          placeholder="Search for pods"
          autoCapitalize="off"
          autoCorrect="off"
          type="text"
          variant="secondary"
          onChange={({ target: { value } }) => setSearchQuery(value)}
        />
      </SearchPodInputContainer>
      <List
        onExpanded={(id, newState) => {
          setExpandedGroupsIds((oldMap) => ({
            ...oldMap,
            [id]: newState
          }));
        }}
        style={style}
        list={podsCollectionList}
      />
    </>
  );
};

const SearchPodInputContainer = styled.div`
  padding: 0 24px 24px 24px;
`;

export const PodsCollectionBottomModal = (): JSX.Element | null => {
  const activeBottomModal = useBottomModal();
  const [scrollPosition, setScrollPosition] = useState(0);
  const listContainerRef = useRef<HTMLDivElement | null>(null);
  const timer = useRef<NodeJS.Timeout>();
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  const dispatch = useDispatch();
  const [params, setParams] = useSearchParams();
  const orientation = useOrientation();
  const isLandscape =
    orientation.type === "landscape-primary" ||
    orientation.type === "landscape-secondary";
  const isPodsCollectionModalOpen =
    activeBottomModal.modalType === "pods-collection";

  const activePod = isPodsCollectionModalOpen
    ? activeBottomModal.activePod
    : undefined;

  const modalGoBackBehavior =
    isPodsCollectionModalOpen && activeBottomModal.modalGoBackBehavior
      ? activeBottomModal.modalGoBackBehavior
      : "close";

  const [expandedGroupsIds, setExpandedGroupsIds] = useState<
    Record<string, boolean>
  >({});

  // Check scrollability
  const checkScrollability = (): void => {
    if (listContainerRef.current) {
      const scrollable =
        listContainerRef.current.scrollHeight >
        listContainerRef.current.clientHeight;
      setShowScrollIndicator(scrollable);
    }
  };

  // Check scrollability on mount and when modal opens
  useEffect(() => {
    if (isPodsCollectionModalOpen) {
      checkScrollability();
    }
  }, [isPodsCollectionModalOpen]);

  useLayoutEffect(() => {
    // Restore scroll position when list is shown again
    if (isPodsCollectionModalOpen && listContainerRef.current) {
      if (!activePod) {
        let pos = scrollPosition;
        const folder = params.get("folder");
        // checks if url contains folder route, and if so, scrolls to it
        if (folder) {
          const decodedFolderId = replaceDotWithSlash(decodeURI(folder));
          const folderContainer = document.getElementById(decodedFolderId);
          setExpandedGroupsIds({
            [decodedFolderId]: true
          });
          if (folderContainer) {
            pos = folderContainer.offsetTop;
          }
        }
        listContainerRef.current.scrollTop = pos;
      } else {
        listContainerRef.current.scrollTop = 0;
      }
    }
  }, [
    activePod,
    scrollPosition,
    params,
    setParams,
    isPodsCollectionModalOpen,
    setExpandedGroupsIds
  ]);

  const handlePodClick = useCallback(
    (pcd: PCD<unknown, unknown>) => {
      listContainerRef.current &&
        setScrollPosition(listContainerRef.current.scrollTop);
      dispatch({
        type: "set-bottom-modal",
        modal: {
          modalType: "pods-collection",
          activePod: pcd,
          modalGoBackBehavior: "back"
        }
      });
    },
    [dispatch]
  );

  return (
    <BottomModal
      modalContainerStyle={{ padding: 0, paddingTop: 24 }}
      isOpen={isPodsCollectionModalOpen}
    >
      <Container isLandscape={isLandscape}>
        {!activePod && (
          <UserTitleContainer>
            <Typography fontSize={20} fontWeight={800} align="center">
              COLLECTED PODS
            </Typography>
          </UserTitleContainer>
        )}
        <ListContainer
          ref={listContainerRef}
          onScroll={(e) => {
            const scrollTop = e.currentTarget.scrollTop;
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
          {activePod ? (
            <CardBody isMainIdentity={false} pcd={activePod} />
          ) : (
            <>
              <PodsCollectionList
                style={{ padding: "12px 24px", paddingTop: 0 }}
                onPodClick={handlePodClick}
                expandedGroupsIds={expandedGroupsIds}
                setExpandedGroupsIds={setExpandedGroupsIds}
              />
              {showScrollIndicator && <ScrollIndicator />}
            </>
          )}
        </ListContainer>
        <ContainerWithPadding>
          <Button2
            onClick={() => {
              if (activePod && modalGoBackBehavior !== "close") {
                dispatch({
                  type: "set-bottom-modal",
                  modal: { modalType: "pods-collection" }
                });
              } else {
                dispatch({
                  type: "set-bottom-modal",
                  modal: { modalType: "none" }
                });
              }
            }}
          >
            {activePod && modalGoBackBehavior !== "close" ? "Back" : "Close"}
          </Button2>
        </ContainerWithPadding>
      </Container>
    </BottomModal>
  );
};

const ListContainer = styled.div`
  position: relative; // important for scrolling to the right position of the folder
  overflow-y: auto;
  ${hideScrollCSS}
`;

const Container = styled.div<{ isLandscape: boolean }>`
  display: flex;
  flex-direction: column;
  // 50px comes from 24px padding we have on the bottom modal
  max-height: calc(
    100vh - ${({ isLandscape }): number => (isLandscape ? 50 : 120)}px
  );
`;
const ContainerWithPadding = styled.div`
  padding: 24px 24px 24px 24px;
`;

const UserTitleContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding-bottom: 24px;
`;
