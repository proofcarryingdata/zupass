import { ReactElement } from "react";
import { FaChevronRight } from "react-icons/fa";
import styled from "styled-components";
import { Typography } from "../Typography";
import { ListItem, ListItemType } from "./ListItem";

export type GroupType = {
  children: ListItemType[];
  title?: string;
  isLastItemBorder?: boolean;
  id?: string;
  expanded?: boolean;
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
  group,
  onExpanded
}: {
  group: GroupType;
  onExpanded?: (id: string, expanded: boolean) => void;
}): ReactElement => {
  const { children, title, expanded, isLastItemBorder, id } = group;
  const len = children.length;
  return (
    <GroupContainer key={id} id={id}>
      <Typography
        onClick={() => onExpanded && id && onExpanded(id, !expanded)}
        style={{ cursor: onExpanded ? "pointer" : "default" }}
        fontWeight={500}
        fontSize={14}
        color="var(--text-tertiary)"
        family="Rubik"
      >
        {title}
        <FaChevronRight
          color="var(--text-tertiary)"
          style={{
            transform: expanded ? "rotate(90deg)" : undefined,
            transition: "transform 0.2s ease-in-out",
            marginLeft: 6,
            height: 10,
            verticalAlign: "middle"
          }}
        />
      </Typography>
      {(!!expanded || !onExpanded) &&
        children.map((child, i) => {
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
  onExpanded?: (id: string, expanded: boolean) => void;
};

export const List = ({ list, style, onExpanded }: ListProps): ReactElement => {
  return (
    <div style={style}>
      {list.map((child) => {
        return isListGroup(child) ? (
          <ListGroup group={child} onExpanded={onExpanded} />
        ) : (
          <ListItem {...child} />
        );
      })}
    </div>
  );
};
