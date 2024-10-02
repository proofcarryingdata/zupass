import { isEdDSATicketPCD } from "@pcd/eddsa-ticket-pcd";
import { isPODTicketPCD } from "@pcd/pod-ticket-pcd";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { PCDCollection } from "@pcd/pcd-collection";
import { PCD } from "@pcd/pcd-types";

const getActivePod = (
  collection: PCDCollection,
  activePodId: string,
  type: "ticketId" | "id"
): PCD<unknown, unknown> | undefined => {
  if (type === "ticketId") {
    return collection
      .getAll()
      .find(
        (pod) =>
          (isPODTicketPCD(pod) || isEdDSATicketPCD(pod)) &&
          pod.claim.ticket.ticketId === activePodId
      );
  } else {
    return collection.getById(activePodId);
  }
};
export const PodsCollectionBottomModal = (): JSX.Element => {
  const activeBottomModal = useBottomModal();
  const [scrollPosition, setScrollPosition] = useState(0);
  const listContainerRef = useRef<HTMLDivElement | null>(null);
  const dispatch = useDispatch();
  const pcdCollection = usePCDCollection();
  const isPodsCollectionModalOpen =
    activeBottomModal.modalType === "pods-collection";

  const activePod =
    isPodsCollectionModalOpen && activeBottomModal.activePodId
      ? getActivePod(
          pcdCollection,
          activeBottomModal.activePodId,
          activeBottomModal.idType ?? "id"
        )
      : undefined;

  console.log(pcdCollection.getAll().map((p) => console.log(p)));

  const podsCollectionList = useMemo(() => {
    const allPcds = pcdCollection.getAll();
    const result: Record<string, GroupType> = {};
    for (const [key, value] of Object.entries(pcdCollection.folders)) {
      if (!result[value]) {
        result[value] = {
          title: value.replace("/", "+"),
          children: []
        };
      }

      const pcd = allPcds.find((pcd) => pcd.id === key);
      if (!pcd) {
        continue;
      }

      const edsaIsTicket = isEdDSATicketPCD(pcd);
      const podIsTicket = isPODTicketPCD(pcd);

      const isTicket = edsaIsTicket || podIsTicket;
      result[value].children.push({
        title: isTicket ? pcd.claim.ticket.eventName : pcd.type,
        key: pcd.id,
        onClick: () => {
          listContainerRef.current &&
            setScrollPosition(listContainerRef.current.scrollTop);
          dispatch({
            type: "set-bottom-modal",
            modal: { modalType: "pods-collection", activePodId: pcd.id }
          });
        },
        LeftIcon: isTicket ? (
          <Avatar imgSrc={pcd.claim.ticket.imageUrl} />
        ) : undefined
      });
    }

    return Object.values(result);
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
        <UserTitleContainer>
          <Typography fontSize={20} fontWeight={800} align="center">
            COLLECTED PODS
          </Typography>
        </UserTitleContainer>
        <ListContainer ref={listContainerRef}>
          {activePod ? (
            <CardBody newUI={true} isMainIdentity={false} pcd={activePod} />
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
