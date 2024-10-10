import styled from "styled-components";
import { AppError } from "../../../src/state";
import { BottomModal } from "../BottomModal";
import { Button2 } from "../Button";
import { Typography } from "../Typography";

export const ErrorBottomModal = ({
  error,
  onClose
}: {
  error: AppError | undefined;
  onClose: () => void;
}): JSX.Element => {
  const { title, message } = error || {};

  return (
    <BottomModal isOpen={!!error}>
      <Container>
        <TitleContainer>
          <Typography fontSize={20} fontWeight={800}>
            {title}
          </Typography>
          <Typography fontSize={16} fontWeight={400} family="Rubik">
            {message}
          </Typography>
        </TitleContainer>
        <Button2 onClick={onClose}>Close</Button2>
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
