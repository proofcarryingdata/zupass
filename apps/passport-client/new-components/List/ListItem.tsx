import styled from "styled-components";
import { Typography } from "../Typography";
import { FaChevronRight } from "react-icons/fa";
import { Avatar } from "../Avatar";

export type ListItemVariant = "primary" | "danger";
export type ListItemType = {
  title: string;
  LeftIcon?: React.ReactNode;
  variant?: ListItemVariant;
  showBottomBorder?: boolean;
};

const getVariantColor = (variant: ListItemVariant) => {
  switch (variant) {
    case "danger":
      return "var(--new-danger)";
    default:
    case "primary":
      return "var(--text-primary)";
  }
};
const ListItemContainer = styled.div<{ variant: ListItemVariant }>`
  display: flex;
  width: 100%;
  align-items: center;
  gap: 16px;
  color: ${({ variant }) => getVariantColor(variant)};
`;

const ListItemRightContainer = styled.div<{ showBottomBorder: boolean }>`
  flex: 1 1 auto;

  display: flex;
  height: 56px;
  align-items: center;
  justify-content: space-between;
  ${({ showBottomBorder }) =>
    showBottomBorder
      ? "border-bottom: 1px solid rgba(0, 0, 0, 0.05);"
      : undefined};
`;

const IconContainer = styled.div`
  width: 36px;
  height: 36px;

  display: flex;
  align-items: center;
  justify-content: center;
`;

export const ListItem = ({
  title,
  LeftIcon,
  variant,
  showBottomBorder
}: ListItemType) => {
  const defaultVariant = variant ?? "primary";
  const defaultShowBottomBorder =
    showBottomBorder !== undefined ? showBottomBorder : true;
  return (
    <ListItemContainer variant={defaultVariant}>
      <IconContainer>{LeftIcon ? LeftIcon : <Avatar />}</IconContainer>
      <ListItemRightContainer showBottomBorder={defaultShowBottomBorder}>
        <Typography
          family="Neue Haas Unica"
          fontWeight={500}
          fontSize={16}
          color={getVariantColor(defaultVariant)}
        >
          {title}
        </Typography>
        <FaChevronRight color={getVariantColor(defaultVariant)} />
      </ListItemRightContainer>
    </ListItemContainer>
  );
};
