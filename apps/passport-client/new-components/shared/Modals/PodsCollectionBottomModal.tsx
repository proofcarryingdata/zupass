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

export const PodsCollectionBottomModal = (): JSX.Element => {
  const activeBottomModal = useBottomModal();
  const [scrollPosition, setScrollPosition] = useState(0);
  const listContainerRef = useRef<HTMLDivElement | null>(null);
  const dispatch = useDispatch();
  const pcdCollection = usePCDCollection();
  const isPodsCollectionModalOpen =
    activeBottomModal.modalType === "pods-collection";
  const activePodId = isPodsCollectionModalOpen
    ? activeBottomModal.activePodId
    : undefined;

  const activePod = activePodId
    ? pcdCollection.getById(activePodId)
    : undefined;

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
    if (!activePod && listContainerRef.current) {
      listContainerRef.current.scrollTop = scrollPosition;
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
            <List list={podsCollectionList} />
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
  height: 500px;
  overflow-y: auto;
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
`;
const ContainerWithPadding = styled.div`
  padding: 24px;
`;

const UserTitleContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding-bottom: 24px;
`;
