import { FaTrashCan } from "react-icons/fa6";
import styled from "styled-components";
import { useBottomModal, useDispatch } from "../../../src/appHooks";
import { Avatar } from "../Avatar";
import { BottomModal } from "../BottomModal";
import { Button2 } from "../Button";
import { List } from "../List";
import { Typography } from "../Typography";

const exampleList = [
  {
    title: "Event Passes",
    isLastItemBorder: false,
    children: [
      {
        title: "Devcon Pass",
        LeftIcon: <Avatar imgSrc="https://i.imgur.com/Fzs5N9T.jpeg" />
      },
      {
        title: "Berlin Event Pass",
        LeftIcon: <FaTrashCan />
      },
      {
        title: "Denver Event Pass",
        LeftIcon: <FaTrashCan />
      }
    ]
  },
  {
    title: "Puddle Crypto",
    children: [
      {
        title: "American Bullfrog",
        LeftIcon: (
          <Avatar
            imgSrc={`https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fwww.nrdc.org%2Fsites%2Fdefault%2Ffiles%2Fstyles%2Fmedium_100%2Fpublic%2Fmedia-uploads%2F02_b3ewye_2400.jpg.jpg%3Fitok%3D4cywc1Uq&f=1&nofb=1&ipt=d994e52f175331180fca4072983909856868e3f3687df2475a18206a29a2b29b&ipo=images`}
          />
        )
      },
      {
        title: "Wood Frog",
        LeftIcon: (
          <Avatar
            imgSrc={`https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fmiro.medium.com%2Fv2%2Fresize%3Afit%3A1200%2F1*EKAWH3tIOEed1vSrzzhDpg.jpeg&f=1&nofb=1&ipt=af41ba48a56ef7af73a0f953d337053dfd6f0e69963763ef2eafd55d489b4b72&ipo=images`}
          />
        )
      }
    ]
  },
  {
    title: "FrogCraiglist",
    children: [
      {
        title: "Digital Chair Listing"
      }
    ]
  }
];

export const PodsCollectionBottomModal = (): JSX.Element => {
  const activeBottomModal = useBottomModal();
  const dispatch = useDispatch();

  console.log("activeBottomModal.modalType", activeBottomModal.modalType);

  return (
    <BottomModal isOpen={activeBottomModal.modalType === "pods-collection"}>
      <Container>
        <UserTitleContainer>
          <Typography fontSize={20} fontWeight={800} align="center">
            ALALALLALAAAA
          </Typography>
        </UserTitleContainer>
        <List list={exampleList} />
        <Button2
          onClick={() => {
            dispatch({
              type: "set-bottom-modal",
              modal: { modalType: "none" }
            });
          }}
        >
          Back
        </Button2>
      </Container>
    </BottomModal>
  );
};

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
