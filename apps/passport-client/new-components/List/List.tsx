import styled from "styled-components";
import { Typography } from "../Typography";
import { ListItem, ListItemType } from "./ListItem";

export type GroupType = {
  children: ListItemType[];
  title?: string;
};

type ListChild = GroupType | ListItemType;
const isListGroup = (child: ListChild): child is GroupType => {
  return !!(child as GroupType).children;
};

const GroupContainer = styled.div`
  width: 100%;
  margin-bottom: 20px;
`;

const ListGroup = ({ children, title }: GroupType) => {
  return (
    <GroupContainer>
      <Typography color="var(--text-tertiary)" family="Neue Haas Unica">
        {title}
      </Typography>
      {children.map((child) => {
        return <ListItem {...child} />;
      })}
    </GroupContainer>
  );
};

type ListProps = {
  list: ListChild[];
};

const ListContainer = styled.div`
  padding: 12px 24px;
`;

export const List = ({ list }: ListProps) => {
  return (
    <ListContainer>
      {list.map((child) => {
        return isListGroup(child) ? (
          <ListGroup {...child} />
        ) : (
          <ListItem {...child} />
        );
      })}
    </ListContainer>
  );
};
