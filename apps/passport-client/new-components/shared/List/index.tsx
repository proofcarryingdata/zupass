import styled from "styled-components";
import { Typography } from "../Typography";
import { ListItem, ListItemType } from "./ListItem";
import { ReactElement } from "react";

export type GroupType = {
  children: ListItemType[];
  title?: string;
  isLastItemBorder?: boolean;
  id?: string;
};

type ListChild = GroupType | ListItemType;
const isListGroup = (child: ListChild): child is GroupType => {
  return !!(child as GroupType).children;
};

const GroupContainer = styled.div`
  width: 100%;
  margin-bottom: 20px;
`;

const ListGroup = ({
  children,
  title,
  isLastItemBorder,
  id
}: GroupType): ReactElement => {
  const len = children.length;
  return (
    <GroupContainer key={id} id={id}>
      <Typography color="var(--text-tertiary)" family="Rubik">
        {title}
      </Typography>
      {children.map((child, i) => {
        if (i === len - 1) {
          return (
            <ListItem
              {...child}
              showBottomBorder={isLastItemBorder}
              key={child.key}
            />
          );
        }
        return <ListItem {...child} key={child.key} />;
      })}
    </GroupContainer>
  );
};

type ListProps = {
  list: ListChild[];
  style?: React.CSSProperties;
};

const ListContainer = styled.div`
  padding: 12px 24px;
`;

export const List = ({ list, style }: ListProps): ReactElement => {
  return (
    <ListContainer style={style}>
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
