import { isEdDSATicketPCD } from "@pcd/eddsa-ticket-pcd";
import { isPODTicketPCD } from "@pcd/pod-ticket-pcd";
import { useMemo } from "react";
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

  return (
    <BottomModal isOpen={isPodsCollectionModalOpen}>
      <Container>
        <UserTitleContainer>
          <Typography fontSize={20} fontWeight={800} align="center">
            COLLECTED PODS
          </Typography>
        </UserTitleContainer>
        <ListContainer>
          {activePod ? (
            <CardBody newUI={true} isMainIdentity={false} pcd={activePod} />
          ) : (
            <List list={podsCollectionList} />
          )}
        </ListContainer>
        <Button2
          onClick={() => {
            dispatch({
              type: "set-bottom-modal",
              modal: { modalType: "none" }
            });
          }}
        >
          Close
        </Button2>
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
  gap: 24px;
`;

const UserTitleContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
`;
