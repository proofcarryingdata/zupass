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
  expended?: boolean;
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
  onExpended
}: {
  group: GroupType;
  onExpended?: (id: string, expended: boolean) => void;
}): ReactElement => {
  const { children, title, expended, isLastItemBorder, id } = group;
  const len = children.length;
  return (
    <GroupContainer key={id} id={id}>
      <Typography
        onClick={() => onExpended && id && onExpended(id, !expended)}
        fontWeight={500}
        color="var(--text-tertiary)"
        family="Rubik"
      >
        <FaChevronRight
          color="var(--text-tertiary)"
          style={{
            transform: expended ? "rotate(90deg)" : undefined,
            transition: "transform 0.2s ease-in-out",
            marginRight: 10,
            verticalAlign: "text-top",
            color: "var(--text-primary)"
          }}
        />
        {title}
      </Typography>
      {(!!expended || !onExpended) &&
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
  onExpended?: (id: string, expended: boolean) => void;
};

export const List = ({ list, style, onExpended }: ListProps): ReactElement => {
  return (
    <div style={style}>
      {list.map((child) => {
        return isListGroup(child) ? (
          <ListGroup group={child} onExpended={onExpended} />
        ) : (
          <ListItem {...child} />
        );
      })}
    </div>
  );
};
