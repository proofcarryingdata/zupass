import styled from "styled-components";
import { Typography } from "../Typography";
import { FaChevronRight } from "react-icons/fa";

export type ListItemType = {
  title: string;
  LeftIcon: React.ReactNode;
};

const ListItemContainer = styled.li`
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

export const ListItem = ({ title, LeftIcon }: ListItemType) => {
  return (
    <ListItemContainer>
      {LeftIcon}
      <ListItemRightContainer>
        <Typography>{title}</Typography>
        <FaChevronRight color="var(--text-tertiary)" />
      </ListItemRightContainer>
    </ListItemContainer>
  );
};
