import styled from "styled-components";
import { Typography } from "../Typography";
import { FaChevronRight } from "react-icons/fa";
import { Avatar } from "../Avatar";

export type ListItemType = {
  title: string;
  LeftIcon?: React.ReactNode;
};

const ListItemContainer = styled.div`
  display: flex;
  width: 100%;
  align-items: center;
  gap: 16px;
`;

const ListItemRightContainer = styled.div`
  flex: 1 1 auto;

  display: flex;
  height: 56px;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
`;

const IconContainer = styled.div`
  width: 36px;
  height: 36px;

  display: flex;
  align-items: center;
  justify-content: center;
`;

export const ListItem = ({ title, LeftIcon }: ListItemType) => {
  return (
    <ListItemContainer>
      <IconContainer>{LeftIcon ? LeftIcon : <Avatar />}</IconContainer>
      <ListItemRightContainer>
        <Typography family="Neue Haas Unica" fontWeight={500} fontSize={16}>
          {title}
        </Typography>
        <FaChevronRight color="var(--text-tertiary)" />
      </ListItemRightContainer>
    </ListItemContainer>
  );
};
