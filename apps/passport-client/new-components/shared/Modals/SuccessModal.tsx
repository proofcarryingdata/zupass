import styled from "styled-components";
import { useBottomModal, useDispatch } from "../../../src/appHooks";
import { BottomModal } from "../BottomModal";
import { Button2 } from "../Button";
import { Typography } from "../Typography";

export const SuccessModal = (): JSX.Element => {
  const activeBottomModal = useBottomModal();
  const dispatch = useDispatch();

  const getData = (): {
    title: string;
    description: string;
  } => {
    if (activeBottomModal.modalType === "success-modal") {
      return {
        title: activeBottomModal.title,
        description: activeBottomModal.description
      };
    }
    return {
      title: "",
      description: ""
    };
  };

  const { title, description } = getData();

  return (
    <BottomModal isOpen={activeBottomModal.modalType === "success-modal"}>
      <Container>
        <TitleContainer>
          <Typography fontSize={20} fontWeight={800}>
            {title}
          </Typography>
          <Typography fontSize={16} fontWeight={400} family="Rubik">
            {description}
          </Typography>
        </TitleContainer>
        <Button2
          onClick={() => {
            dispatch({
              type: "set-bottom-modal",
              modal: { modalType: "settings" }
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
const TitleContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
`;
