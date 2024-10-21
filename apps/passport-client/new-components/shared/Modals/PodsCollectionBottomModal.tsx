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
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { CardBody } from "../../../components/shared/PCDCard";
import {
  useBottomModal,
  useDispatch,
  usePCDCollection
} from "../../../src/appHooks";
import { Avatar } from "../Avatar";
import { BottomModal } from "../BottomModal";
import { Button2 } from "../Button";
import { GroupType, List } from "../List";
import { Typography } from "../Typography";

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
export const PodsCollectionBottomModal = (): JSX.Element | null => {
  const activeBottomModal = useBottomModal();
  const [scrollPosition, setScrollPosition] = useState(0);
  const listContainerRef = useRef<HTMLDivElement | null>(null);
  const dispatch = useDispatch();
  const pcdCollection = usePCDCollection();
  const isPodsCollectionModalOpen =
    activeBottomModal.modalType === "pods-collection";

  const activePod = isPodsCollectionModalOpen
    ? activeBottomModal.activePod
    : undefined;

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
        result[value] = {
          title: value.replace(/\//g, " · "),
          children: []
        };
      }

      const pcd = filteredPcds.find((pcd) => pcd.id === key);
      if (!pcd) continue;

      result[value].children.push({
        title: getPcdName(pcd),
        key: pcd.id || getPcdName(pcd),
        onClick: () => {
          listContainerRef.current &&
            setScrollPosition(listContainerRef.current.scrollTop);
          dispatch({
            type: "set-bottom-modal",
            modal: { modalType: "pods-collection", activePod: pcd }
          });
        },
        LeftIcon: getPCDImage(pcd)
      });
    }

    return Object.values(result).filter((group) => group.children.length > 0);
  }, [pcdCollection, dispatch]);

  useEffect(() => {
    // Restore scroll position when list is shown again
    if (listContainerRef.current) {
      if (!activePod) {
        listContainerRef.current.scrollTop = scrollPosition;
      } else {
        listContainerRef.current.scrollTop = 0;
      }
    }
  }, [activePod, scrollPosition]);

  return (
    <BottomModal
      modalContainerStyle={{ padding: 0, paddingTop: 24 }}
      isOpen={isPodsCollectionModalOpen}
    >
      <Container>
        {!activePod && (
          <UserTitleContainer>
            <Typography fontSize={20} fontWeight={800} align="center">
              COLLECTED PODS
            </Typography>
          </UserTitleContainer>
        )}
        <ListContainer ref={listContainerRef}>
          {activePod ? (
            <CardBody isMainIdentity={false} pcd={activePod} />
          ) : (
            <List style={{ paddingTop: 0 }} list={podsCollectionList} />
          )}
        </ListContainer>
        <ContainerWithPadding>
          <Button2
            onClick={() => {
              if (activePod) {
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
            {activePod ? "Back" : "Close"}
          </Button2>
        </ContainerWithPadding>
      </Container>
    </BottomModal>
  );
};

const ListContainer = styled.div`
  overflow-y: auto;
  max-height: calc(100vh - 260px);
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: fit-content;
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
